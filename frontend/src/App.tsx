import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { connect } from './lib/ws';
import { HudPage } from './hud/HudPage';
import { ControlPage } from './control/ControlPage';
export function App() {
  const location = useLocation();
  const role = location.pathname === '/hud' ? 'hud' : 'control';
  useEffect(() => connect(role), [role]);
  return <Routes><Route path="/hud" element={<HudPage/>}/><Route path="/control" element={<ControlPage/>}/><Route path="*" element={<Navigate to="/control" replace/>}/></Routes>;
}
