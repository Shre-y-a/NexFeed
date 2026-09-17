import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout({ children, topbarProps }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar {...topbarProps} />
        {children}
      </div>
    </div>
  );
}
