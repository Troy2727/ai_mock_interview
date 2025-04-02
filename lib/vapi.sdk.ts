import Vapi from "@vapi-ai/web";

// Create a safe browser environment check
let vapi: any;

// Only initialize Vapi on the client side, not during server-side rendering
if (typeof window !== 'undefined') {
  try {
    // Check if mediaDevices is supported before initializing Vapi
    if (navigator && navigator.mediaDevices) {
      console.log("Initializing Vapi with token:", process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN?.substring(0, 5) + "...");
      
      // Initialize Vapi
      vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN!);
      
      // Enable debug mode if available
      if (vapi.setDebug) {
        vapi.setDebug(true);
      }
      
      // Test audio permissions immediately to catch issues early
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          console.log("Audio permissions granted successfully");
          stream.getTracks().forEach(track => track.stop()); // Clean up the test stream
        })
        .catch(err => {
          console.error("Audio permission error:", err.name, err.message);
          alert("Audio permission denied. Please enable microphone access for the interview to work properly.");
        });
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
