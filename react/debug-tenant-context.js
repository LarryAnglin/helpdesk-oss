// Debug tenant context data - Run in browser console
// This will help us understand why the dropdown shows duplicates

async function debugTenantData() {
  console.log('🔍 Debugging tenant context data...');
  
  try {
    // Check if the TenantContext data is available in the window
    console.log('1. Checking window React devtools...');
    
    // Try to access React component state through various methods
    let tenantContextData = null;
    
    // Method 1: Try to find React fiber data
    const rootElement = document.getElementById('root');
    if (rootElement && rootElement._reactInternalFiber) {
      console.log('Found React fiber data');
    } else if (rootElement && rootElement._reactInternalInstance) {
      console.log('Found React internal instance');
    }
    
    // Method 2: Check for any global tenant data
    if (window.tenantData) {
      tenantContextData = window.tenantData;
      console.log('Found window.tenantData:', tenantContextData);
    }
    
    // Method 3: Direct Firebase query to see what's actually in the database
    console.log('\n2. Checking Firebase database directly...');
    
    // Import Firebase functions from the global module
    const { collection, getDocs, query, where } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    // This won't work without the app instance, so let's try a different approach
    console.log('3. Checking localStorage and sessionStorage...');
    
    // Check localStorage for tenant data
    const savedTenantId = localStorage.getItem('currentTenantId');
    console.log('localStorage currentTenantId:', savedTenantId);
    
    // Check all localStorage keys for tenant-related data
    const allLocalStorageKeys = Object.keys(localStorage);
    const tenantKeys = allLocalStorageKeys.filter(key => key.toLowerCase().includes('tenant'));
    console.log('Tenant-related localStorage keys:', tenantKeys);
    tenantKeys.forEach(key => {
      console.log(`  ${key}:`, localStorage.getItem(key));
    });
    
    // Check sessionStorage
    const allSessionStorageKeys = Object.keys(sessionStorage);
    const sessionTenantKeys = allSessionStorageKeys.filter(key => key.toLowerCase().includes('tenant'));
    console.log('Tenant-related sessionStorage keys:', sessionTenantKeys);
    sessionTenantKeys.forEach(key => {
      console.log(`  ${key}:`, sessionStorage.getItem(key));
    });
    
    console.log('\n4. Examining DOM for tenant selector elements...');
    
    // Find the tenant selector dropdown
    const tenantButtons = document.querySelectorAll('button[aria-expanded]');
    console.log('Found buttons with aria-expanded:', tenantButtons.length);
    
    tenantButtons.forEach((button, index) => {
      if (button.textContent.includes('Default Organization')) {
        console.log(`Button ${index}:`, button.textContent);
        console.log('  Parent element:', button.parentElement);
        console.log('  React props:', button._reactInternalFiber || button._reactInternalInstance);
      }
    });
    
    // Find menu items
    const menuItems = document.querySelectorAll('[role="menuitem"]');
    console.log('Found menu items:', menuItems.length);
    
    menuItems.forEach((item, index) => {
      if (item.textContent.includes('Default Organization')) {
        console.log(`Menu item ${index}:`, item.textContent);
        console.log('  Data attributes:', [...item.attributes].map(attr => `${attr.name}="${attr.value}"`));
      }
    });
    
    console.log('\n5. Checking for duplicate array entries...');
    
    // Try to run our tenant loading function
    if (window.getAllTenants) {
      const tenants = await window.getAllTenants();
      console.log('getAllTenants result:', tenants);
    }
    
    // Try to access the tenant context through React DevTools if available
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('React DevTools detected - you can inspect component state in the React tab');
    }
    
  } catch (error) {
    console.error('Error during debugging:', error);
  }
}

// Make it available globally
window.debugTenantData = debugTenantData;

// Run the debug
debugTenantData();