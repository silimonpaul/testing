class AudioHandler {
  constructor() {
    this.hasAudio = true;
    const Ac = window.AudioContext || window.webkitAudioContext;
    this.sampleBuffer = new Float64Array(735);
    this.samplesPerFrame = 735;

    if (Ac === undefined) {
      log("Audio disabled: no Web Audio API support");
      this.hasAudio = false;
    } else {
      this.actx = new Ac();

      const samples = this.actx.sampleRate / 60;
      this.sampleBuffer = new Float64Array(samples);
      this.samplesPerFrame = samples;

      log("Audio initialized, sample rate: " + samples * 60);

      this.inputBuffer = new Float64Array(4096);
      this.inputBufferPos = 0;
      this.inputReadPos = 0;

      this.scriptNode = undefined;
      this.dummyNode = undefined;
    }

    this.resume = () => {
      // for Chrome autoplay policy
      if (this.hasAudio) {
        this.actx.onstatechange = () => {
          log(this.actx.state);
        };
        this.actx.resume();
      }
    };

    this.start = () => {
      if (this.hasAudio) {
        this.dummyNode = this.actx.createBufferSource();
        this.dummyNode.buffer = this.actx.createBuffer(1, 44100, 44100);
        this.dummyNode.loop = true;

        this.scriptNode = this.actx.createScriptProcessor(2048, 1, 1);
        this.scriptNode.onaudioprocess = (e) => this.handleAudioProcess(e);

        this.dummyNode.connect(this.scriptNode);
        this.scriptNode.connect(this.actx.destination);
        this.dummyNode.start();
      }
    };

    this.stop = () => {
      if (this.hasAudio) {
        if (this.dummyNode) {
          this.dummyNode.stop();
          this.dummyNode.disconnect();
          this.dummyNode = undefined;
        }
        if (this.scriptNode) {
          this.scriptNode.disconnect();
          this.scriptNode = undefined;
        }
        this.inputBufferPos = 0;
        this.inputReadPos = 0;
      }
    };

    this.process = (e) => {
      if (this.inputReadPos + 2048 > this.inputBufferPos) {
        // we overran the buffer
        //log("Audio buffer overran");
        this.inputReadPos = this.inputBufferPos - 2048;
      }
      if (this.inputReadPos + 4096 < this.inputBufferPos) {
        // we underran the buffer
        //log("Audio buffer underran");
        this.inputReadPos += 2048;
      }
      let output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < 2048; i++) {
        output[i] =
          this.inputBuffer[this.inputReadPos++ % this.inputBuffer.length];
      }
    };

    this.nextBuffer = () => {
      if (this.hasAudio) {
        for (let i = 0; i < this.samplesPerFrame; i++) {
          let val = this.sampleBuffer[i];
          this.inputBuffer[this.inputBufferPos++ % this.inputBuffer.length] =
            val;
        }
      }
    };
  }

  // This method processes audio data and fills the output buffer with the input buffer data.
  handleAudioProcess(e) {
    this.process(e);
  }
}
