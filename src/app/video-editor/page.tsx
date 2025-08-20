import { VideoEditorProviders } from './_context/Providers';
import VideoEditorClient from './_components/VideoEditorClient';

// Context Provider로 감싼 페이지 컴포넌트
export default function VideoEditorPage() {
  return (
    <VideoEditorProviders>
      <VideoEditorClient />
    </VideoEditorProviders>
  );
}