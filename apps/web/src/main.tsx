import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CHAIN_ID } from '@beacon/core';

createRoot(document.getElementById('root')!).render(
  <StrictMode><main><h1>Beacon</h1><p>Synthetic public notice board — setup scaffold.</p><p>Target: Tiramisu ({CHAIN_ID}).</p><p>A valid signature proves wallet control, not an organization's identity.</p></main></StrictMode>,
);
