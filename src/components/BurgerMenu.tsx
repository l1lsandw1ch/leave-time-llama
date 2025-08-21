import { useState } from 'react';
import { Menu, User, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ProfileDialog } from './ProfileDialog';

export const BurgerMenu = () => {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const [isOpen, setIsOpen] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = profile?.display_name || 'User';

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader className="space-y-4">
          <SheetTitle className="text-left">Menu</SheetTitle>
          
          {/* Profile Section */}
          <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="text-lg">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">{getGreeting()},</p>
              <p className="font-semibold text-lg">{displayName}</p>
            </div>
          </div>
        </SheetHeader>

        {/* Menu Items */}
        <div className="mt-8 space-y-2">
          <ProfileDialog>
            <Button
              variant="ghost"
              className="w-full justify-start h-12 text-left"
              onClick={() => setIsOpen(false)}
            >
              <User className="mr-3 h-5 w-5" />
              Profile Settings
            </Button>
          </ProfileDialog>

          <Button
            variant="ghost"
            className="w-full justify-start h-12 text-left text-destructive hover:text-destructive"
            onClick={() => {
              setIsOpen(false);
              signOut();
            }}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};