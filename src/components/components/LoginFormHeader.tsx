import React from 'react';
import { Code2, Search } from 'lucide-react';

interface LoginFormHeaderProps {
  title: string;
}

const LoginFormHeader: React.FC<LoginFormHeaderProps> = ({ title }) => {
  return (
    <div className="header-area">
      <div className="flex items-center gap-3">
        <Code2 className="w-5 h-5 text-blue-400" />
        <span className="text-sm font-medium text-white">{title}</span>
        <Search className="w-4 h-4 text-slate-400 hover:text-blue-400 transition-colors" />
      </div>
    </div>
  );
};

export { LoginFormHeader };