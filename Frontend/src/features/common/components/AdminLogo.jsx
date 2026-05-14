import Logo from './Logo';

const AdminLogo = ({ className = "h-10 w-10" }) => {
  return (
    <div className={`flex items-center justify-center shrink-0 ${className} relative group transition-all duration-300`}>
      <div className="absolute inset-0 bg-sky-500/10 rounded-xl blur-lg group-hover:bg-sky-500/20 transition-all" />
      <Logo variant="icon" className="h-full w-full relative z-10" />
    </div>
  );
};

export default AdminLogo;
