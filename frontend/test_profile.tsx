import React from 'react';
import { renderToString } from 'react-dom/server';
import { BrowserRouter } from 'react-router-dom';

// We need to mock import of Profile because it uses Vite aliases or other things.
// Or we can just use ts-node / vite-node.
