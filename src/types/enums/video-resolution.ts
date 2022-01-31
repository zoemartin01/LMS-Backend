/**
 * An enum representing a recording's video resolution.
 *
 * @typedef {V720 | V1080 | V1440 | V2160} VideoResolution
 * @kind enum
 * @enumerators {V144} The video resolution is 256x144
 * @enumerators {V240} The video resolution is 320x240
 * @enumerators {V360} The video resolution is 640x360
 * @enumerators {V480} The video resolution is 640x480
 * @enumerators {V720} The video resolution is 1280x720
 * @enumerators {V1080} The video resolution is 1920x1080
 * @enumerators {V1440} The video resolution is 2560x1440
 * @enumerators {V2160} The video resolution is 3840x2160
 */
export enum VideoResolution {
  V144 = '256x144',
  V240 = '320x240',
  V360 = '640x360',
  V480 = '640x480',
  V720 = '1280x720',
  V1080 = '1920x1080',
  V1440 = '2560x1440',
  V2160 = '3840x2160',
}
