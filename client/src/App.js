import React, { useRef, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";
import "./App.css";

const App = () => {
  const waveformRef = useRef(null);

  useEffect(() => {
    if (waveformRef.current) {
      waveformRef.current = WaveSurfer.create({
        container: waveformRef.current,
      });

      waveformRef.current.on("ready", () => {
        waveformRef.current.setVolume(0.5);
        waveformRef.current.play();
      });

      // Removes events, elements and disconnects Web Audio nodes.
      // when component unmounts
      return () => waveformRef.current.destroy();
    }
  }, []);

  return (
    <div className="App">
      <div ref={waveformRef} />
    </div>
  );
};

export default App;
