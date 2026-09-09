import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { supabase } from '../supabaseClient';
import { FaFilePdf, FaLink, FaTrash } from 'react-icons/fa';
import AdminLayout from '../components/AdminLayout';

const MediaContainer = styled.div`
  padding: 10px 0;
  color: #fff;
  background: transparent;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
`;

const UploadSection = styled.div`
  background: #1a1a1a;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 40px;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  text-align: center;
`;

const FileInput = styled.input`
  display: none;
`;

const UploadLabel = styled.label`
  padding: 10px 20px;
  background: #7B1F2E;
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  display: inline-block;
  &:hover { background: #a0283a; }
`;

const MediaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
`;

const MediaItem = styled.div`
  background: #111;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  aspect-ratio: 16/9;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const MediaPreview = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const VideoPreview = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2a2a2a;
  font-size: 0.8rem;
`;

const ActionBtns = styled.div`
  position: absolute;
  top: 5px;
  right: 5px;
  display: flex;
  gap: 5px;
`;

const DarkBtn = styled.button`
  background: rgba(0,0,0,0.7);
  color: ${props => props.$delete ? '#ff4d4d' : '#fff'};
  border: 1px solid rgba(255,255,255,0.2);
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 4px;
  &:hover { background: #000; border-color: ${props => props.$delete ? '#ff4d4d' : '#fff'}; }
`;

const Toast = styled.div`
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #7B1F2E;
  color: #fff;
  padding: 10px 20px;
  border-radius: 30px;
  z-index: 1000;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
`;

const MediaLibrary = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    const { data, error } = await supabase.storage.from('media').list();
    if (error) console.error(error);
    else setFiles(data);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('media').upload(fileName, file);

    if (error) {
      alert('Error uploading: ' + error.message);
    } else {
      fetchMedia();
    }
    setUploading(false);
  };

  const handleCopy = (fileName) => {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${fileName}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (fileName) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    const { error } = await supabase.storage.from('media').remove([fileName]);
    if (error) alert(error.message);
    else fetchMedia();
  };

  return (
    <MediaContainer>
      {copied && <Toast>✅ URL Copied to clipboard!</Toast>}
      <Header>
        <h1>Media Library</h1>
        <button onClick={() => window.location.href = '/admin/dashboard'}>Back to Dashboard</button>
      </Header>

      <UploadSection>
        <UploadLabel htmlFor="upload-media">
          {uploading ? 'Uploading...' : 'Upload New Media (Image/Video/PDF)'}
        </UploadLabel>
        <FileInput 
          id="upload-media" 
          type="file" 
          accept="image/*,video/*,application/pdf" 
          onChange={handleUpload}
          disabled={uploading}
        />
      </UploadSection>

      <MediaGrid>
        {files.map((file) => (
          <MediaItem key={file.id}>
            {file.name.match(/\.(mp4|webm|ogg)$/i) ? (
              <VideoPreview>🎥 {file.name}</VideoPreview>
            ) : file.name.match(/\.pdf$/i) ? (
              <VideoPreview><FaFilePdf style={{ fontSize: '2rem', color: '#ff4d4d' }} /> <div style={{ marginTop: '10px' }}>{file.name}</div></VideoPreview>
            ) : (
              <MediaPreview src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${file.name}`} />
            )}
            <ActionBtns>
              <DarkBtn onClick={() => handleCopy(file.name)}><FaLink /> Copy URL</DarkBtn>
              <DarkBtn $delete onClick={() => handleDelete(file.name)}><FaTrash /></DarkBtn>
            </ActionBtns>
          </MediaItem>
        ))}
      </MediaGrid>
    </MediaContainer>
  );
};

const MediaLibraryPage = () => <AdminLayout><MediaLibrary /></AdminLayout>;
export { MediaLibrary };
export default MediaLibraryPage;
