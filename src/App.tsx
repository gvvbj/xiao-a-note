import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/shared/components/layout/AppShell';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { NoteEditor } from '@/modules/built-in/editor/components/NoteEditor';
import { ErrorBoundary } from '@/shared/components/ui/ErrorBoundary';

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AppShell>
          <Routes>
            <Route element={<AppLayout />}>
              {/* 默认首页显示 Editor */}
              <Route path="/" element={<NoteEditor />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AppShell>
      </ErrorBoundary>
    </Router>
  );
}

export default App;