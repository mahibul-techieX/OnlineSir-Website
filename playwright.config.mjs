import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser',
 fullyParallel:false,
 workers:1,
 reporter:'list',
 use:{baseURL:'http://127.0.0.1:4321',headless:true,channel:'chrome'},
});
