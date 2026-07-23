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
      <div className="flex w-full min-h-screen">
        <div className="page-wrapper flex w-full ">
          {/* Header/sidebar */}
          <div className="xl:block hidden">
            <Sidebar />
          </div>
          <div className="body-wrapper w-full bg-white dark:bg-dark flex flex-col min-h-screen">
            {/* Top Header  */}
            <Header />

            {/* Body Content  */}
            <div className="container mx-auto px-6 py-8 flex-1 flex flex-col">
              <main className="grow">
                <Outlet />
              </main>
              
              <footer className="mt-8 border-t border-stroke dark:border-strokedark pt-6">
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
