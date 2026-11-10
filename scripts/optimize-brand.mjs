import sharp from 'sharp';
await sharp('assets/brand/onlinesir-logo-original.png').resize({width:600}).webp({quality:90}).toFile('public/brand/logo.webp');
await sharp('assets/brand/onlinesir-favicon-original.png').resize(64,64).png().toFile('public/brand/favicon.png');
console.log('Generated web-sized brand assets; originals preserved.');
