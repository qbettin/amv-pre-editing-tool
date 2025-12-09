# 🎬 AMV Pre-Editing Tool
Desktop application for preparing AMV clips by removing dead/static frames using changes in character pose or in whole frames.

# Setup
## Local Environment
### Python

Python 3.10+: (I'm using 3.11.0)

- Download from https://www.python.org/downloads/
- Check "Add Python to PATH" during installation
- Or do this manually

### FFmpeg:

##### First get ffmpeg
- Download from https://www.gyan.dev/ffmpeg/builds/
- Get the "release full" build
- Extract it and add the bin folder to your system PATH

### Dependencies 
Run `pip install -r requirements.txt` from the root dir
- Fallback if that fails `python -m pip install -r requirements.txt
`
- this should also run `npm install`, but if it doesn't run that now

### Starting it
- run `npm start` thats it!

## Building the executable
### Setup
- run `npm run build:setup` to first bundle python and the script as an executable

    - will create a `python-dist` dir in `/resources`
        - will contain `frame_processor.exe` when complete
    - will create `/build` and `/dist` dirs in your `python` dir
        - leave as is (python exe in dist, bundled python in build)
    - will check if you have the ffmpeg binary
### Electron Build
- run `npm run build:app` to initiate the `electron-builder` command
    - installer/setup will be in the new `/dist` folder in the root dir when complete
# Goals
### Processing Options
- dead frame removal (done)
- upscaling
- frame interpolation
- better character pose detection
### Video Preview
- preview on upload
- segment clip in to scenes or trim it
- automatic clip (scene) detection
- ability to merge scenes, select scenes, or manually adjust scenes
- all scenes would be processed as different files to a user specified locations and filename
- with editable options for each scene, or apply to all options
### App Goals
- runs its own python and ffmpeg
- probably dockerized
### Deployment and Maintenance
- CD/CI pipelines
- figure out 'deployment'
