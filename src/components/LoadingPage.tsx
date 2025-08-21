import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface LoadingPageProps {
  src?: string;
  message?: string;
  submessage?: string;
}

const LoadingPage: React.FC<LoadingPageProps> = ({ 
  src = 'https://lottie.host/4faf8a98-3b5b-4069-a5e8-bc73e0dd9c89/b82v2UEcjX.lottie',
  message = '載入中...',
  submessage
}) => {
  return (
    <div className="min-h-screen bg-background-primary flex items-center justify-center">
      <div className="text-center">
        <div className="w-32 h-32 mx-auto mb-6">
          <DotLottieReact
            src={src}
            loop
            autoplay
            className="w-full h-full"
          />
        </div>
        <p className="text-text-primary text-lg font-medium mb-2">
          {message}
        </p>
        {submessage && (
          <p className="text-text-secondary text-sm">
            {submessage}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingPage;