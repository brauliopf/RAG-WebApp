import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import AuthButton from './AuthButton';

interface HeaderAction {
  label: string;
  to?: string;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  icon?: React.ReactNode;
  hideOnMobile?: boolean;
  mobileIcon?: React.ReactNode;
}

interface HeaderProps {
  subtitle?: string;
  actions?: HeaderAction[];
  showLogo?: boolean;
  logoTo?: string;
}

const Header = ({
  subtitle,
  actions = [],
  showLogo = true,
  logoTo = '/',
}: HeaderProps) => {
  return (
    <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {showLogo && (
              <Link to={logoTo} className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  RAG Assistant
                </h1>
              </Link>
            )}
            {!showLogo && (
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                RAG Assistant
              </h1>
            )}
            {subtitle && (
              <div className="hidden sm:flex items-center space-x-3">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-indigo-400 rounded-full"></div>
                <span className="text-base font-medium text-gray-600">
                  {subtitle}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {actions.length > 0 && (
              <>
                {actions.map((action, index) =>
                  action.to ? (
                    <Link key={index} to={action.to}>
                      <Button
                        variant={action.variant || 'outline'}
                        className={`flex items-center space-x-2 ${
                          action.hideOnMobile ? 'hidden sm:flex' : ''
                        }`}
                      >
                        {action.mobileIcon ? (
                          <>
                            <span className="sm:hidden">
                              {action.mobileIcon}
                            </span>
                            <span className="hidden sm:flex items-center space-x-2">
                              {action.icon}
                              <span>{action.label}</span>
                            </span>
                          </>
                        ) : (
                          <>
                            {action.icon}
                            <span className="hidden sm:inline">
                              {action.label}
                            </span>
                          </>
                        )}
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      key={index}
                      variant={action.variant || 'outline'}
                      onClick={action.onClick}
                      className={`flex items-center space-x-2 ${
                        action.hideOnMobile ? 'hidden sm:flex' : ''
                      }`}
                    >
                      {action.mobileIcon ? (
                        <>
                          <span className="sm:hidden">{action.mobileIcon}</span>
                          <span className="hidden sm:flex items-center space-x-2">
                            {action.icon}
                            <span>{action.label}</span>
                          </span>
                        </>
                      ) : (
                        <>
                          {action.icon}
                          <span className="hidden sm:inline">
                            {action.label}
                          </span>
                        </>
                      )}
                    </Button>
                  )
                )}
              </>
            )}
            <AuthButton />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
