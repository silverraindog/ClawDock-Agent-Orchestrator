  Check,
  Code2,
  Sliders,
  Layers,
  Sparkles,
  Search,
  ArrowUpCircle,
  Activity,
  Menu,
  AlertTriangle,
  PanelBottom,
  PanelTop,
  X,
  Info,
  Save,
  FolderTree
} from 'lucide-react';
import { AgentId, AgentInfo, DockerSystemInfo, SystemUpdateItem } from '../types';
import { ApiHealthIndicator } from './ApiHealthIndicator';
import { INITIAL_UPDATES } from './data/updatesData';
import { validateModelAgainstCatalog } from './utils/modelValidation';
import * as YAML from 'js-yaml';
import * as toml from 'smol-toml';
import { LoginFormHeader } from './components/LoginFormHeader';
import { DashboardTab } from './components/DashboardTab';


interface ContainerMetadataBadgeProps {
  agentId: string;
}

export const ContainerMetadataBadge: React.FC<ContainerMetadataBadgeProps> = ({ agentId }) => {
  const [version, setVersion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    const fetchMetadata = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/agents/${agentId}/metadata`);
        if (res.ok) {
          const data = await res.json();
          if (active && data.success && data.version) {
            setVersion(data.version);
          }
        }
      } catch (err) {
        console.error('Failed to fetch container metadata:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchMetadata();
    return () => {
      active = false;
    };
  }, [agentId]);

  if (isLoading) {
    return (
      <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold bg-slate-800 text-slate-500 border border-slate-700 animate-pulse">
        Metadata Loading...
      </span>
    );
  }

  if (!version) return null;

  return (
    <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20" title="Live Container Metadata Version tag fetched from backend">
      <div className="flex flex-col items-end leading-none gap-0.5">
        <span className="text-[7px] uppercase font-bold text-slate-500 tracking-tighter">Container Tag</span>
        <span className="text-[10px] font-mono font-bold text-indigo-400">
          {version.startsWith('v') ? version : `v${version}`}
        </span>
      </div>
    </div>
  );
};

const Navbar: React.FC = () => {
  return (
    <nav className="navbar">
      {/* Inject the Login/Header Component here */}
      <div className="header-area">
        <LoginFormHeader title="Media Player Dashboard" />
      </div >

      <div className="nav-links">
        {/* The original complex Navbar logic structure is replaced by this simplified wrapper.
           (Placeholder for original navigation links content if needed, but following the suggested snippet exactly)
        */}
      </div >
    </nav>
  );
};

export default Navbar;

