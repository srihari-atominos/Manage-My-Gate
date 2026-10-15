// @ts-nocheck
import { FC } from 'react';
import { Outlet } from 'react-router';
import { useSelector } from 'react-redux';
// @ts-ignore
import useNotificationSocket from 'src/features/notification/hooks/useNotificationSocket.js';
import Sidebar from './vertical/sidebar/Sidebar';
import useWorkspaceSocket from '../../features/workspace/hooks/useWorkspaceSocket';

import Header from './vertical/header/Header';
import { Footer } from '../../components/dashboards/modern/Footer';

const FullLayout: FC = () => {
  const user = useSelector((state: any) => state.auth.user);
  useNotificationSocket(user?.id || user?._id);
  useWorkspaceSocket();

  return (
    <>
      <div className="flex w-full min-h-screen bg-[#F6F8FC] dark:bg-[#0A1220]">
        <div className="page-wrapper flex w-full min-h-screen">
          {/* Header/sidebar */}
          <div className="xl:block hidden w-[270px] flex-shrink-0">
            <Sidebar />
          </div>
          <div className="body-wrapper w-full flex flex-col min-h-screen flex-1 min-w-0">
            {/* Top Header  */}
            <Header />

            {/* Body Content  */}
            <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col">
              <main className="grow">
                <Outlet />
              </main>
              
              <footer className="mt-8 border-t border-[#E5EAF2] dark:border-slate-800 pt-6">
                <Footer />
              </footer>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FullLayout;
