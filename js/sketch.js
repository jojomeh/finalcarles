/**
 * Handles everything
 */
function NERDDISCO_animation(args) {
  // Queue of elements
  this.queue = [];

  // There were n+1 elements removed
  this.deleted_elements = false;

  // Connect to audio
  this.audio = args.audioSource || null;

  // New dot counter
  this.new_dot_counter = 0;
  // The max amount of frames to wait until a new dot is added while audio is playing
  this.new_dot_counter_max_playing = 20;
  // The max amount of frames to wait until a new dot is added while audio is not playing
  this.new_dot_counter_max_not_playing = 180;

  // Add a new element right now
  this.instant = false;

  // Current frame count
  this.instant_counter = 0;
  // Wait n frames to reset instant_counter
  this.instant_counter_max = 2;

  // Low volume = slow animations
  this.slow = false;
}



NERDDISCO_animation.prototype = {
  // Add new element to the queue
  add : function(args) {

    this.queue.push(
      new circle({
   			x: args.x,
    		y: args.y,
    		radius: 1,
        speed: args.speed,
        audio: this.audio,
        opacity : args.opacity || 0.35
  		})
    );

  },

  // Update all elements in the queue
  update : function(event) {
    // Initial state
    this.deleted_elements = false;

    // Add a new dot after 60 frames
    if ( (this.audio.volume > 0 && this.new_dot_counter > this.new_dot_counter_max_playing) ||
         (this.audio.volume == 0 && this.new_dot_counter > this.new_dot_counter_max_not_playing) ||
        (this.instant && this.instant_counter > this.instant_counter_max)
       ) {

      var random_point = Point.random();
      var speed = this.getRandom(10, 25);
      var opacity = 1;

      // Slow beat
      if (this.slow) {
        speed = 5;
        this.slow = false;
      }

      // Audio is playing
      if (this.audio.volume > 0) {
        opacity = Math.random();

      // No audio is playing
      } else {
        opacity = 0.1;
      }

      // Add circle
      this.add({
        x: paper.view.size.width * random_point.x,
        y: paper.view.size.height * random_point.y,
        speed: speed,
        opacity: opacity
      });

      // Reset
      this.new_dot_counter = 0;

      // Reset
      this.instant = false;

      // Reset
      this.instant_counter = 0;

    } else {
      this.new_dot_counter++;
    }

    // Iterate over all elements
    for (var i = 0; i < this.queue.length; i++) {
      // Update the current element
      // @return true = remove element
      // @return false = don't remove the element
      var remove = this.queue[i].update(event);

      // Remove the element
      if (remove) {
        // Delete the value of the current element inside the queue
        // but keep the position (so that the loop is not influenced)
        delete this.queue[i];

        // Element was deleted from queue
        this.deleted_elements = true;
      }
    }

    // There were deleted elements
    if (this.deleted_elements) {
      // Remove all "deleted elements" (no value, just position) from the queue
      this.queue = this.queue.filter(function(n) { return n != undefined });
    }

    // Loud :D
    if (this.audio.volume > 14050) {
      if (this.queue.length < 40) {
        this.instant = true;
        this.instant_counter++;
      }
    }

    // Not loud :D
    if (this.audio.volume <= 14050) {
      this.slow = true;
    }

  },


  /**
   * Get a random number between min and max.
   */
  getRandom : function(min, max) {
    return Math.random() * (max - min) + min;
	},
};


function circle(args) {
  // Basic circle
  this.path = new Path.Circle({
    center: new Point(args.x, args.y),
    radius: args.radius,
    fillColor: this.getRandomColor(),
    opacity : args.opacity
  });

  // Initial radius of the circle
  this.radius = args.radius;

  // The amount that gets added to this.radius on every frame
  this.speed = args.speed;

  // Connect to an audio source
  this.audio = args.audio;
}

circle.prototype = {
  update : function() {

    // Element is not bigger than the size of the view
    if (!(this.radius > paper.view.size.width + 50 && this.radius > paper.view.size.height + 50)) {
      // Scale the element
      this.path.scale((this.radius + this.speed) / this.radius);

      // Increase radius
      this.radius += this.speed;

      // Change the color
      this.path.fillColor.hue += (this.speed / 2);

      // Element stays another frame in the queue
      return false;

    } else {
      this.path.remove();

      // Remove element from queue
      return true;
    }
  },

  getRadius : function() {
    return this.path.bounds.width / 2;
  },

  getRandomColor : function() {
    return randomColor({
   	  luminosity: 'bright',
      format: 'rgb'
    });
  }
};






var SoundCloudAudioSource = function(player) {
  console.log(player);
    var self = this;
    var analyser;
    var audioCtx = new (window.AudioContext || window.webkitAudioContext);
    player.crossOrigin = 'anonymous';
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    var source = audioCtx.createMediaElementSource(player);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    var sampleAudioStream = function() {
        analyser.getByteFrequencyData(self.streamData);
        // calculate an overall volume value
        var total = 0;
        for (var i = 0; i < 80; i++) { // get the volume from the first 80 bins, else it gets too loud with treble
            total += self.streamData[i];
        }
        self.volume = total;


    };
    setInterval(sampleAudioStream, 20);
    // public properties and methods
    this.volume = 0;
    this.streamData = new Uint8Array(128);
    this.playStream = function(streamUrl) {
        // get the input stream from the audio element
        player.addEventListener('ended', function(){
            project.clear();
        });
        player.setAttribute('src', streamUrl);
        player.pause();
    }
};







/**
 * Makes a request to the Soundcloud API and returns the JSON data.
 */
var SoundcloudLoader = function(player) {
    var self = this;
    var client_id = "dce5652caa1b66331903493735ddd64d";
    this.sound = {};
    this.streamUrl = "";
    this.errorMessage = "";
    this.player = player;

    /**
     * Loads the JSON stream data object from the URL of the track (as given in the location bar of the browser when browsing Soundcloud),
     * and on success it calls the callback passed to it (for example, used to then send the stream_url to the audiosource object).
     * @param track_url
     * @param callback
     */
    this.loadStream = function(track_url, successCallback, errorCallback) {
        SC.initialize({
            client_id: client_id
        });
        SC.get('/resolve', { url: track_url }, function(sound) {
            if (sound.errors) {
                self.errorMessage = "";
                for (var i = 0; i < sound.errors.length; i++) {
                    self.errorMessage += sound.errors[i].error_message + '<br>';
                }
                self.errorMessage += 'Make sure the URL has the correct format: https://soundcloud.com/sonrie-es-bueno/marzo-17-sabado';
                errorCallback();
            } else {
              self.sound = sound;
              self.streamUrl = function(){ return sound.stream_url + '?client_id=' + client_id; };
              successCallback();
            }
        });
    };

};



    var player =  document.getElementById('soundcloud_player');
    var loader = new SoundcloudLoader(player);
    console.log (player);
    var audioSource = new SoundCloudAudioSource(player);

    var loadAndUpdate = function(trackUrl, autoplay) {
        loader.loadStream(trackUrl,
            function() {
              audioSource.playStream(loader.streamUrl());

          		// Automatically start playback
              if (autoplay) {
                project.clear();
                player.play();
              }

          		// Update the title
          		meta__track.innerHTML = loader.sound.title;

            },
            function() {
                console.error(loader.errorMessage);
            });
    };



var soundcloud_url_input = document.getElementById('soundcloud_url');
var soundcloud_load_url_button = document.getElementById('soundcloud_load_url');

var meta__track = document.getElementById('meta__track');

/**
 * Handle clicks on the SoundCloud "load url"-button.
 */
soundcloud_load_url_button.addEventListener('click', function(e) {
  e.preventDefault();

  // The URL of the track on SoundCloud
  var soundcloud_url = soundcloud_url_input.value;

  loadAndUpdate(soundcloud_url, true);
}, false);


// Load sound on page load
if (soundcloud_url_input.value !== '') {
  loadAndUpdate(soundcloud_url_input.value, false);
}

//loadAndUpdate('https://soundcloud.com/dnbmc/drum-n-bass-march-midimix-2015-miss-hardtech-b2b-dnbmc');

//loadAndUpdate('https://soundcloud.com/blaize323/i-like-to-move-it-move-it-blaize-remix');

//loadAndUpdate('https://soundcloud.com/blaize323/its-tricky-run-dmc-blaize');





paper.install(window);
paper.setup('NERDDISCO-Studio-alpha_0_0_0_0_0_1');

var NERDDISCO_animation_ = new NERDDISCO_animation({ audioSource : audioSource });

// Update the view
paper.view.onFrame = function(event) {
  NERDDISCO_animation_.update(event);
};
