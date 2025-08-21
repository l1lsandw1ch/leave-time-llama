import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cookie, Shield, X } from 'lucide-react';

interface CookieConsentProps {
  onAccept: () => void;
}

const CookieConsent = ({ onAccept }: CookieConsentProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('workday-tracker-consent');
    if (!consent) {
      setIsVisible(true);
    } else {
      onAccept();
    }
  }, [onAccept]);

  const handleAccept = () => {
    localStorage.setItem('workday-tracker-consent', 'accepted');
    setIsVisible(false);
    onAccept();
  };

  const handleDecline = () => {
    localStorage.setItem('workday-tracker-consent', 'declined');
    setIsVisible(false);
    // Still call onAccept but without storing timer data
    onAccept();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-primary/10 rounded-full">
                <Cookie className="h-8 w-8 text-primary" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-card-foreground">
                Data Storage Consent
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We'd like to store your work timer data locally on your device so you can:
              </p>
              <ul className="text-sm text-muted-foreground text-left space-y-1 mt-3">
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-accent" />
                  Resume your timer when you reopen the app
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-accent" />
                  View your check-in/check-out history
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-accent" />
                  Keep track of your remaining work time
                </li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3">
                All data stays on your device. We don't collect or share any information.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleDecline}
                variant="outline"
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Decline
              </Button>
              <Button
                onClick={handleAccept}
                className="flex-1 bg-gradient-to-r from-primary to-primary/80"
              >
                <Shield className="h-4 w-4 mr-2" />
                Accept
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CookieConsent;