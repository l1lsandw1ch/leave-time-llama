import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import WorkdayTracker from '@/components/WorkdayTracker';
import { BurgerMenu } from '@/components/BurgerMenu';

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div>
      <div className="flex justify-between items-center p-4 border-b">
        <h1 className="text-xl font-semibold">
          {profile?.display_name ? `Welcome ${profile.display_name}` : 'Workday Tracker'}
        </h1>
        <BurgerMenu />
      </div>
      <WorkdayTracker />
    </div>
  );
};

export default Index;
