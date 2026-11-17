import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useStore } from './lib/store';
import { AppShell } from './shell/AppShell';
import { Dashboard } from './screens/Dashboard';
import { Proposals } from './screens/Proposals';
import { SignIn } from './screens/SignIn';
import { ShareView } from './screens/ShareView';
import { Wizard } from './screens/wizard/Wizard';
import { Editor } from './screens/editor/Editor';
import { ExperienceLibrary } from './screens/library/ExperienceLibrary';
import { ContentLibrary } from './screens/library/ContentLibrary';

export function App() {
  const { user } = useStore();
  const loc = useLocation();

  // The share view is read-only and works without signing in.
  if (loc.pathname.startsWith('/share')) return <ShareView />;
  if (!user) return <SignIn />;

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<Wizard />} />
        <Route path="/p/:id" element={<Editor />} />
        <Route path="/proposals" element={<Proposals />} />
        <Route path="/library" element={<ExperienceLibrary />} />
        <Route path="/content" element={<ContentLibrary />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
