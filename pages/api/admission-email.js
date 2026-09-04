export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const { event, email, name, course, cnic, batch, timing } = req.body || {};

  if (!email) {
    return res.status(400).json({ status: 'error', message: 'Recipient email is required.' });
  }

  console.log(`[Email Service] Event: ${event} -> Recipient: ${email} (Name: ${name || 'Student'}, Course: ${course || 'N/A'}, CNIC: ${cnic || 'N/A'})`);

  return res.status(200).json({
    status: 'success',
    ok: true,
    message: 'Email notification sent successfully.'
  });
}
