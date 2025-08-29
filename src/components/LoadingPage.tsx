import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import yarnAnimationData from '../assets/images/CIrcles Yarn.json';

interface LottieAnimationData {
  [key: string]: unknown;
}

interface LoadingPageProps {
  src?: string;
  data?: LottieAnimationData;
  message?: string;
  submessage?: string;
}

const LoadingPage: React.FC<LoadingPageProps> = ({ 
  src,
  data = yarnAnimationData,
  message = '載入中...',
  submessage
}) => {
  return (
    <div className="min-h-screen bg-background-primary flex items-center justify-center">
      <div className="text-center">
        <div className="w-32 h-32 mx-auto mb-6">
          <DotLottieReact
            src={src}
            data={data}
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