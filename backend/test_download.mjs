import villaController from './src/features/villa/villa.controller.js';
import fs from 'fs';

async function test() {
  const req = {};
  const res = {
    setHeader: (k, v) => console.log('SetHeader:', k, v),
    end: () => console.log('End called'),
    _write: (chunk) => console.log('Chunk written', chunk.length),
  };
  
  // mock res stream methods since workbook.xlsx.write(res) writes to stream
  res.write = (chunk) => { console.log('write', chunk.length); return true; };
  res.on = (evt, cb) => { console.log('on', evt); };
  res.once = (evt, cb) => { console.log('once', evt); };
  res.emit = (evt, ...args) => { console.log('emit', evt); };
  
  const next = (err) => console.error('Next called with error:', err);
  
  await villaController.downloadBulkUploadTemplate(req, res, next);
}

test();
