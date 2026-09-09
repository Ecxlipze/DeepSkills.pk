import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import smtp from '../lib/smtp.cjs';
let db, mode, state, operations, mail, signed, failAt;
let serial = 0;
let profileId;
mock.module('../lib/supabaseServer.js', { namedExports: { getSupabaseServerClient: () => db } });
mock.module('../lib/portalAuthServer.js', { namedExports: {
  authorizeAdminOperation: async (_req, permission) => {
    assert.equal(permission, 'hr');
    return mode === 'admin' ? { ok: true, role: 'admin' } : { ok: false, status: mode === 'view' ? 403 : 401, message: 'Access denied.' };
  },
  validatePortalSession: async (_db, _token, roles) => { assert.deepEqual(roles, ['teacher']); return mode === 'teacher' ? { ok: true, session: { cnic: '12345-1234567-1' } } : { ok: false }; },
  normalizeCnic: value => /^\d{5}-\d{7}-\d$/.test(value || '') ? value : ''
} });
const { default: inquiry } = await import('../pages/api/inquiry.js');
const { default: register } = await import('../pages/api/register.js');
const { default: contact } = await import('../pages/api/contact.js');
const { hrHandler } = await import('../lib/hrActions.js');
const { requestJson } = await import('../src/utils/requestJson.js');
function makeDb() {
 return {
  storage: { from(bucket) { assert.equal(bucket, 'hr-files'); return { async createSignedUrl(path, seconds) { signed.push([path, seconds]); return { data: { signedUrl: 'https://files.example.test/signed-document' } }; } }; } },
  from(table) {
   let action = 'read', payload, conflict, filters = [], limit;
   const q = {
    select() { return q; }, eq(k,v) { filters.push(r=>r[k]===v); return q; }, limit(n) { limit=n; return q; },
    insert(rows) { action='insert';payload=rows;return q; }, update(row) { action='update';payload=row;return q; },
    upsert(row, options) { action='upsert';payload=row;conflict=options?.onConflict;return q; },
    async single() { const r=execute(); return { ...r, data:r.data?.[0] || null }; },
    then(resolve,reject) { return Promise.resolve(execute()).then(resolve,reject); }
   };
   function execute() {
    operations.push(`${table}.${action}`);
    if(failAt===`${table}.${action}`)return { error:{ code:'fixture_db_error' },data:null };
    state[table] ||= [];
    let rows=state[table].filter(r=>filters.every(f=>f(r)));
    if(action==='insert'){rows=payload.map(r=>({id:'created-'+serial,...r}));state[table].push(...rows);}
    if(action==='update')rows.forEach(r=>Object.assign(r,payload));
    if(action==='upsert'){
     const old=state[table].find(r=>r[conflict]===payload[conflict]);
     if(old)Object.assign(old,payload);else state[table].push({...payload});rows=[payload];
    }
    return {data:limit?rows.slice(0,limit):rows,error:null};
   }
   return q;
  }
 };
}
function response(){return {setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;},end(){return this;}};}
async function run(handler, body, method='POST') { const res=response();await handler({method,headers:{authorization:'Bearer fixture'},body,__supabase:db},res);return res; }
test.beforeEach(t=>{
 profileId='profile-'+(++serial);mode='admin';operations=[];mail=[];signed=[];failAt=null;
 state={hr_profiles:[{id:profileId,teacher_id:'teacher',cnic:'12345-1234567-1',personal_email:'teacher@example.test',expected_salary:500,hr_status:'pending'}],teachers:[{id:'teacher',cnic:'12345-1234567-1',email:'teacher@example.test',name:'Teacher',status:'Pending'}],hr_jds:[{id:'jd',hr_profile_id:profileId,position_title:'Trainer',salary:700}],hr_files:[{hr_profile_id:profileId,file_path:`teacher-teacher/profile-${profileId}/hiring-file/file.pdf`,file_name:'hiring.pdf'}]};
 db=makeDb();
 t.mock.method(smtp,'sendEmail',async message=>{mail.push(message);return {accepted:true};});
});
const inquiryBody={name:'Student',phone:'03001234567',email:'student@example.test',cnic:'12345-1234567-1',city:'Lahore',courseInterest:'React',hearAboutUs:'Friend',status:'approved',referralCode:'REF'};
const registrationBody={firstName:'Test',lastName:'Student',email:'student@example.test',mobileNo:'03001234567',cnic:'12345-1234567-1',selectedCourse:'React',lastEducation:'College',source:'Friend',gender:'Other',age:20,status:'Active'};
test('public forms reject wrong methods/invalid input without data or email effects',async()=>{
 for(const handler of [inquiry,register,contact]){
  assert.equal((await run(handler,{},'GET')).code,405);
  assert.equal((await run(handler,{})).code,400);
  assert.equal((await run(handler,{'bot-field':'bot'})).code,200);
 }
 assert.equal(operations.length,0);assert.equal(mail.length,0);
});
test('inquiry preserves field aliases, referral, saved ID and server-controlled status',async()=>{
 const res=await run(inquiry,inquiryBody);assert.equal(res.code,200);
 assert.equal(res.body.data.status,'new');assert.equal(res.body.data.course_interest,'React');assert.equal(res.body.data.referral_code,'REF');assert.ok(res.body.data.id);
});
test('registration creates only Pending admissions and rejects duplicates without overwriting',async()=>{
 const res=await run(register,registrationBody);assert.equal(res.code,200);assert.equal(res.body.data.status,'Pending');assert.equal(res.body.data.name,'Test Student');
 assert.equal((await run(register,registrationBody)).code,409);assert.equal(state.admissions.length,1);
 assert.equal((await run(register,{...registrationBody,age:101})).code,400);
});
test('database failure cannot produce public-form success',async()=>{
 failAt='inquiries.insert';assert.equal((await run(inquiry,inquiryBody)).code,500);assert.equal(mail.length,0);
});
test('contact uses a configured recipient and sender transport, with validated reply-to and escaped content',async()=>{
 const res=await run(contact,{name:'Test Student',phone:'+923001234567',email:'reply@example.test',message:'Hello & thanks',to:'attacker@example.test'});
 assert.equal(res.code,200);assert.equal(mail[0].to,process.env.CONTACT_EMAIL_TO||'info@deepskills.pk');assert.equal(mail[0].replyTo,'reply@example.test');assert.match(mail[0].html,/&amp;/);
});
test('contact reports SMTP failure and rejects header injection',async t=>{
 t.mock.method(smtp,'sendEmail',async()=>{throw new Error('fixture');});
 const body={name:'Student',phone:'1234',email:'student@example.test',message:'Test'};
 assert.equal((await run(contact,body)).code,502);assert.equal((await run(contact,{...body,email:'a@example.test\r\nBcc: b@example.test'})).code,400);
});
test('denied HR requests and view-only staff perform no reads, writes, or mail sends',async()=>{
 for(const role of ['denied','view']){mode=role;for(const action of ['send-jd','reject','finalize','notify-admin','share-files']){
  const res=await run(hrHandler(action),{profileId,reason:'test'});assert.ok([401,403].includes(res.code));
 }}assert.deepEqual(operations,[]);assert.equal(mail.length,0);
});
test('teacher cannot read or email another teacher profile',async()=>{
 mode='teacher';state.teachers[0].cnic='99999-9999999-9';
 assert.equal((await run(hrHandler('share-files'),{profileId})).code,403);assert.equal(signed.length,0);assert.equal(mail.length,0);
});
test('teacher shares only own stored file paths using expiring links and server-derived email',async()=>{
 mode='teacher';const res=await run(hrHandler('share-files'),{profileId,email:'attacker@example.test',url:'https://attacker.test'});
 assert.equal(res.code,200);assert.equal(mail[0].to,'teacher@example.test');assert.equal(signed[0][1],3600);assert.match(mail[0].html,/signed-document/);
});
test('unsafe stored paths cannot be signed',async()=>{
 mode='teacher';state.hr_files[0].file_path='teacher-other/profile-other/file.pdf';
 assert.equal((await run(hrHandler('share-files'),{profileId})).code,409);assert.equal(signed.length,0);assert.equal(mail.length,0);
});
test('JD send and rejection preserve saved state and notify the actual recipient',async()=>{
 const res=await run(hrHandler('send-jd'),{profileId});assert.equal(res.code,200);assert.equal(state.hr_jds[0].is_sent_to_teacher,true);assert.equal(state.hr_profiles[0].hr_status,'jd_sent');
 assert.equal((await run(hrHandler('reject'),{profileId,reason:'Incomplete application'})).code,200);assert.equal(state.hr_profiles[0].rejection_reason,'Incomplete application');
});
test('finalize activates teacher, synchronizes access and chosen salary, and avoids duplicate finalization',async()=>{
 const handler=hrHandler('finalize');const res=await run(handler,{profileId});assert.equal(res.code,200);
 assert.equal(state.teachers[0].status,'Active');assert.equal(state.allowed_cnics[0].cnic,'12345-1234567-1');assert.equal(state.teacher_salaries[0].monthly_amount,700);assert.equal(state.hr_profiles[0].hr_status,'hired');
 const count=mail.length;const repeated=await run(handler,{profileId});assert.equal(repeated.body.already_finalized,true);assert.equal(mail.length,count);
});
test('email failure after a saved HR action is an explicit delivery warning',async t=>{
 t.mock.method(smtp,'sendEmail',async()=>{throw new Error('fixture');});
 const res=await run(hrHandler('send-jd'),{profileId});assert.equal(res.code,200);assert.equal(res.body.email_sent,false);assert.ok(res.body.warning);assert.equal(state.hr_profiles[0].hr_status,'jd_sent');
});
test('partial HR database failure is reported and no mail is sent',async()=>{
 failAt='teacher_salaries.upsert';const res=await run(hrHandler('finalize'),{profileId});assert.equal(res.code,500);assert.equal(res.body.partial,true);assert.equal(mail.length,0);assert.equal(state.hr_profiles[0].hr_status,'pending');
});
test('JSON transport does not retry HTML, permission, or network failures',async t=>{
 for(const response of [new Response('<!DOCTYPE html>',{status:404}),new Response(JSON.stringify({status:'error',message:'Denied'}),{status:403})]){
  const fetch=t.mock.method(globalThis,'fetch',async()=>response);await assert.rejects(requestJson('/api/test',{}));assert.equal(fetch.mock.callCount(),1);fetch.mock.restore();
 }
 const fetch=t.mock.method(globalThis,'fetch',async()=>{throw new Error('Network');});await assert.rejects(requestJson('/api/test',{}),/Network/);assert.equal(fetch.mock.callCount(),1);
});
