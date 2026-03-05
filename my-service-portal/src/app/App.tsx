import { Outlet } from 'react-router-dom';
import './App.scss';
import { AppFooter } from './ui/AppFooter/AppFooter';
import { AppHeader } from './ui/AppHeader/AppHeader';

export const App = () => {
  return (
    <div className="app">
      <AppHeader />

      <main className="app__main">
        <Outlet />
      </main>

      <AppFooter />
    </div>
  );
};
