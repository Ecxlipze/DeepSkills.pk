import PublicLayout from '../components/next/PublicLayout';
import Seo from '../components/next/Seo';
import LoginPage from '../src/LoginPage';

export default function Login() {
  return (
    <PublicLayout>
      <Seo title="Login" description="Log in to the DeepSkills student, teacher, or admin portal." path="/login" noindex />
      <LoginPage />
    </PublicLayout>
  );
}
