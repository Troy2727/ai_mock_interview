import Vapi from "@vapi-ai/web";

// Create a safe browser environment check
let vapi: any;

// Only initialize Vapi on the client side, not during server-side rendering
if (typeof window !== 'undefined') {
  try {
    // Check if mediaDevices is supported before initializing Vapi
    if (navigator && navigator.mediaDevices) {
      vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN!);
    } else {
      console.warn("MediaDevices API not available. Using mock Vapi implementation.");
      // Create a mock vapi object when mediaDevices isn't available
      vapi = {
        on: () => {},
        off: () => {},
        start: () => {
          console.warn("Vapi cannot start: MediaDevices API not available in this environment");
          return Promise.resolve();
        },
        stop: () => {}
      };
    }
  } catch (error) {
    console.error("Error initializing Vapi:", error);
    // Create a mock vapi object when initialization fails
    vapi = {
      on: () => {},
      off: () => {},
      start: () => {
        console.warn("Vapi cannot start due to initialization error");
        return Promise.resolve();
      },
      stop: () => {}
    };
  }
} else {
  // Create a mock vapi object that won't cause errors during SSR
  vapi = {
    on: () => {},
    off: () => {},
    start: () => Promise.resolve(),
    stop: () => {}
  };
}

export { vapi };
