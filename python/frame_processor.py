#!/usr/bin/env python3
"""
Anime Frame Processor
Detects and removes dead/static frames from video clips
"""

import cv2
import numpy as np
import argparse
import os
import sys
from pathlib import Path

try:
    import mediapipe as mp
except ImportError:
    print("Error: mediapipe not installed. Run: pip install mediapipe", file=sys.stderr)
    sys.exit(1)


class FrameProcessor:
    """Handles frame analysis and dead frame detection"""
    
    def __init__(self, mode='character', threshold=0.02, min_frames=1):
        self.mode = mode
        self.threshold = threshold
        self.min_frames = min_frames
        
        # Initialize MediaPipe Pose for character detection
        if mode == 'character':
            self.mp_pose = mp.solutions.pose
            self.pose = self.mp_pose.Pose(
                static_image_mode=False,
                model_complexity=1,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )
    
    def detect_character_motion(self, frame1, frame2):
        """
        Detect motion specifically in character using pose estimation
        Returns True if character has moved, False if static
        """
        # Convert frames to RGB for MediaPipe
        rgb1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2RGB)
        rgb2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2RGB)
        
        # Process both frames
        results1 = self.pose.process(rgb1)
        results2 = self.pose.process(rgb2)
        
        # If no pose detected in either frame, consider it motion
        # (character might have left/entered frame)
        if not results1.pose_landmarks or not results2.pose_landmarks:
            return True
        
        # Extract keypoint coordinates
        landmarks1 = results1.pose_landmarks.landmark
        landmarks2 = results2.pose_landmarks.landmark
        
        # Calculate total movement across all keypoints
        total_movement = 0
        keypoint_count = len(landmarks1)
        
        for i in range(keypoint_count):
            # Get normalized coordinates (0-1 range)
            x1, y1 = landmarks1[i].x, landmarks1[i].y
            x2, y2 = landmarks2[i].x, landmarks2[i].y
            
            # Calculate Euclidean distance
            distance = np.sqrt((x2 - x1)**2 + (y2 - y1)**2)
            total_movement += distance
        
        # Average movement per keypoint
        avg_movement = total_movement / keypoint_count
        
        # Return True if movement exceeds threshold
        return avg_movement > self.threshold
    
    def detect_full_frame_motion(self, frame1, frame2):
        """
        Simple frame differencing for full-frame motion detection
        Returns True if frames are different, False if same
        """
        # Convert to grayscale
        gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
        
        # Calculate absolute difference
        diff = cv2.absdiff(gray1, gray2)
        
        # Calculate mean difference
        mean_diff = np.mean(diff) / 255.0  # Normalize to 0-1
        
        # Return True if difference exceeds threshold
        return mean_diff > self.threshold
    
    def process_video(self, input_path, output_dir, output_name=None):
        """
        Main processing function
        Reads video, detects dead frames, and outputs cleaned video
        """
        print(f"Opening video: {input_path}")
        cap = cv2.VideoCapture(input_path)

        if not cap.isOpened():
            raise Exception("Could not open video file")

        # Get video properties
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        print(f"Video info: {width}x{height} @ {fps}fps, {total_frames} frames")

        # Setup output
        if output_name:
            output_path = os.path.join(output_dir, f"{output_name}.mp4")
        else:
            input_filename = Path(input_path).stem
            output_path = os.path.join(output_dir, f"{input_filename}_processed.mp4")
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        # Read first frame
        ret, prev_frame = cap.read()
        if not ret:
            raise Exception("Could not read first frame")
        
        # Always keep first frame
        out.write(prev_frame)
        frames_kept = 1
        frames_removed = 0
        static_frame_count = 0
        
        frame_num = 1
        
        print("Processing frames...")
        
        while True:
            ret, curr_frame = cap.read()
            if not ret:
                break
            
            # Detect motion
            if self.mode == 'character':
                has_motion = self.detect_character_motion(prev_frame, curr_frame)
            else:
                has_motion = self.detect_full_frame_motion(prev_frame, curr_frame)
            
            if has_motion:
                # Motion detected - keep frame
                out.write(curr_frame)
                frames_kept += 1
                static_frame_count = 0
            else:
                # No motion - increment static counter
                static_frame_count += 1
                
                # Keep at least min_frames even if static
                if static_frame_count < self.min_frames:
                    out.write(curr_frame)
                    frames_kept += 1
                else:
                    frames_removed += 1
            
            # Update previous frame for next comparison
            if has_motion:
                prev_frame = curr_frame
            
            # Progress reporting
            frame_num += 1
            if frame_num % 30 == 0:  # Report every 30 frames
                progress = int((frame_num / total_frames) * 100)
                print(f"PROGRESS: {progress}")
                sys.stdout.flush()
        
        # Cleanup
        cap.release()
        out.release()
        
        if self.mode == 'character':
            self.pose.close()
        
        print(f"\nProcessing complete!")
        print(f"Frames kept: {frames_kept}")
        print(f"Frames removed: {frames_removed}")
        print(f"Output saved to: {output_path}")
        
        return output_path


def main():
    parser = argparse.ArgumentParser(description='Remove dead frames from anime clips')
    parser.add_argument('--input', required=True, help='Input video path')
    parser.add_argument('--output', required=True, help='Output directory')
    parser.add_argument('--mode', default='character', choices=['character', 'full'],
                        help='Detection mode: character (pose) or full (frame diff)')
    parser.add_argument('--threshold', type=float, default=0.02,
                        help='Motion detection threshold')
    parser.add_argument('--min-frames', type=int, default=1,
                        help='Minimum frames to keep per scene')
    parser.add_argument('--output-name', default=None,
                        help='Custom output filename (without extension)')

    args = parser.parse_args()
    
    try:
        processor = FrameProcessor(
            mode=args.mode,
            threshold=args.threshold,
            min_frames=args.min_frames
        )
        
        processor.process_video(args.input, args.output, args.output_name)
        
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()