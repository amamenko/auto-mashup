[![MIT License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]

<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="https://github.com/amamenko/auto-mashup#gh-dark-mode-only">
   <img src="https://images.ctfassets.net/r8d0zt89au6z/U08zxXPI7WotVcDYslYBF/1abd688f9038dba10e6aa96f30b84342/automashup_logo_white.svg" width="125" />
  </a>
   <a href="https://github.com/amamenko/auto-mashup#gh-light-mode-only">
    <img src="https://images.ctfassets.net/r8d0zt89au6z/2O6pZhJ8iQoqojzyNZCTRH/4e0020dda6a224a9460e49094417c9ff/automashup_logo.svg" width="125" />
  </a>
   
  <h3 align="center">Auto Mashup</h3>

  <p align="center">
    Music Mashups Automated with Node.js
    <br />
    Featuring Songs from Billboard Charts
    <br />
    <br />
    <a href="https://www.automashup.ml/">Website</a>
    ·
    <a href="https://www.youtube.com/channel/UCbjaDBiyXCqWGT4inY8LCmQ">YouTube Channel</a>
     ·
    <a href="https://www.buymeacoffee.com/automashup">Buy Me a Coffee</a>
    ·
    <a href="https://www.instagram.com/automaticmashup/">Instagram</a>
    ·
    <a href="https://github.com/amamenko/auto-mashup/issues">Report Issue</a> 
  </p>
</p>

## Background

A [mashup](<https://en.wikipedia.org/wiki/Mashup_(music)>), according to [Merriam-Webster's Dictionary](https://www.merriam-webster.com/dictionary/mash-up), is "a piece of music created by digitally overlaying
an instrumental track with a vocal track from a different recording." The idea of mashups has been around since the late 1960s - the first such creation, arguably,
was found on [Harry Nilsson's](https://en.wikipedia.org/wiki/Harry_Nilsson) 1967 album [Pandemonium Shadow Show](https://en.wikipedia.org/wiki/Pandemonium_Shadow_Show), which features a cover of [The Beatles'](https://en.wikipedia.org/wiki/The_Beatles)
["You Can't Do That"](https://en.wikipedia.org/wiki/You_Can%27t_Do_That) with his own vocal recreations of more than a dozen other Beatles songs on the same instrumental track.

Ideally, the vocal track of one song is superimposed seamlessly onto the instrumental track of a separate song, [modifying](https://en.wikipedia.org/wiki/Pitch_shift)
the musical keys and tempos where necessary to achieve a perfect mix. Often, when selecting songs for a mashup, mashup creators search for songs that have similar
[musical keys](<https://en.wikipedia.org/wiki/Key_(music)>), [tempos](https://en.wikipedia.org/wiki/Tempo), and [modes](<https://en.wikipedia.org/wiki/Mode_(music)>).
This not only allows for a better-sounding mix, but increases the audience's ability to recognize distinct elements of both selected songs, while avoiding something like a
"chipmunk"-sounding effect on the audio.

Indeed, due to the fact that there are only so many chords, keys, tempos, song structures, time signatures, and modes, popular songs on the [Billboard](https://www.billboard.com/)
charts can, and often do, sound alike. The weekly [Billboard magazine](<https://en.wikipedia.org/wiki/Billboard_(magazine)>) tracks the most popular trending songs
across various genres of music and displays various charts containing music rankings on their [website](<(https://www.billboard.com/)>). Charts include
the [Hot 100](https://www.billboard.com/charts/hot-100/) and the [Billboard Global 200](https://www.billboard.com/charts/billboard-global-200/),
as well as greatest-of-all-time (GOAT) charts such as [GOAT Hot 100 Songs](greatest-hot-100-singles), [GOAT Songs of the '90s](greatest-billboards-top-songs-90s),
and [GOAT Songs of the Summer](https://www.billboard.com/charts/greatest-of-all-time-songs-of-the-summer/).

In 2021, American singer-songwriter [Olivia Rodrigo](https://en.wikipedia.org/wiki/Olivia_Rodrigo) added two members of American rock band
[Paramore](https://en.wikipedia.org/wiki/Paramore) as co-writers of her single [“Good 4 U”](https://en.wikipedia.org/wiki/Good_4_U)
[due to the similarities](https://variety.com/2021/music/news/olivia-rodrigo-paramore-good-4-u-misery-business-1235048791/)
between her own song and Paramore’s 2007 song [“Misery Business."](https://en.wikipedia.org/wiki/Misery_Business)
[Multiple mashups](https://www.youtube.com/results?search_query=good+4+u+misery+business+mashup) of
the two songs can be be found online. This is not an isolated incident - many songs across multiple genres and decades sound similar or can be manipulated
to sound similar - although perhaps not due to directly lifting elements from other musical works.

Notable mashup artists including [Neil Cicierega](https://en.wikipedia.org/wiki/Neil_Cicierega) and [Girl Talk](<https://en.wikipedia.org/wiki/Girl_Talk_(musician)>) have released entire mashup albums such as [Mouth Sounds](https://en.wikipedia.org/wiki/Mouth_Sounds) and [Feed the Animals](https://en.wikipedia.org/wiki/Feed_the_Animals), respectively. Platforms such as [Tik Tok](https://www.tiktok.com/) and [YouTube](https://www.youtube.com/) have no dearth of mashup material - such creations have clearly become exceedingly popular. The question is - with the formulaic concepts and techniques involved in creating a musical mashup, can mashup-creation be automated?

## Functionality

The Auto Mashup project spans two repositories.

The first repository ([the one you are visiting right now](https://github.com/amamenko/auto-mashup)) represents
the [Node.js](https://nodejs.org/en/) and [Express](https://expressjs.com/) server that handles the weekly regular Billboard chart scraping, monthly GOAT
Billboard chart scraping, individual song data/audio stem acquisition logic, and writing to a [Contentful Content Management System](https://www.contentful.com/).

The second repository
([https://github.com/amamenko/auto-mashup-mix](https://github.com/amamenko/auto-mashup-mix)) contains both the client-side website logic of [auto-mashup.vercel.app](https://auto-mashup.vercel.app)
(built with [React](https://reactjs.org/)) and the Node.js/Express server that uses the song data acquired in Contentful to find and create automated song mashups
with [FFMPEG](https://ffmpeg.org/) and create and upload a weekly video of mashups to the [Auto Mashup YouTube channel](https://www.youtube.com/channel/UCbjaDBiyXCqWGT4inY8LCmQ)
and a post to the [@automaticmashup Instagram page](https://www.instagram.com/automaticmashup/).

The basic functionality of this repository's code logic is:

<strong>Billboard Chart Scraping:</strong>

- Use [cheerio](https://www.npmjs.com/package/cheerio) to scrape song position data from charts on [billboard.com](https://www.billboard.com/) using logic modified from [billboard-top-100](https://www.npmjs.com/package/billboard-top-100).
- Remove any old entries and their associated instrumental and accompaniment audio assets if the song is no longer present on any Billboard chart.
- Scrape regular Billboard charts via a CRON job set up via [node-cron](https://www.npmjs.com/package/node-cron) every Wednesday and greatest-of-all-time Billboard charts on the first Sunday of every month. The selected Billboard charts include:
<br />
<table align="center">
  <tr>
    <th>Regular Billboard Charts</th>
    <th>GOAT Billboard Charts</th>
  </tr>
  <tr>
    <td>The Hot 100</td>
    <td>GOAT Hot 100 Songs</td>
  </tr>
  <tr>
    <td>Billboard Global 200</td>
    <td>GOAT Hot 100 Songs by Women</td>
  </tr>
  <tr>
    <td>Radio Songs</td>
    <td>GOAT Songs of the Summer</td>
  </tr>
  <tr>
    <td>Hot Dance/Electronic Songs</td>
    <td>GOAT Songs of the '80s</td>
  </tr>
  <tr>
    <td>Hot Rap Songs</td>
    <td>GOAT Songs of the '90s</td>
  </tr>
  <tr>
    <td>Hot R&B/Hip-Hop Songs</td>
    <td>GOAT Hot R&B/Hip-Hop Songs</td>
  </tr>
  <tr>
    <td>Hot R&B Songs</td>
    <td>GOAT Adult Alternative Songs</td>
  </tr> 
  <tr>
    <td>Hot Alternative Songs</td>
    <td>GOAT Alternative Songs</td>
  </tr>
  <tr>
    <td>Hot Country Songs</td>
    <td>GOAT Hot Country Songs</td>
  </tr>
  <tr>
    <td>Hot Mainstream Rock Songs</td>
    <td>GOAT Mainstream Rock Songs</td>
  </tr>
  <tr>
    <td>Mexico Airplay</td>
    <td>GOAT Pop Songs</td>
  </tr>
  <tr>
    <td>Hot Latin Songs</td>
    <td>GOAT Adult Pop Songs</td>
  </tr>
</table>
<br />
<br />

<strong>Song Data Acquisition:</strong>

- Use the [Spotify Web API](https://www.npmjs.com/package/spotify-web-api-node) to get an audio analysis for every track on the Billboard chart with a Spotify
  song ID (noting the song's tempo, key, and mode, in addition to the track name and artist name). Songs with a time signature other than
  [4/4 (common time)](https://en.wikipedia.org/wiki/Time_signature#common_time) are excluded since 4/4 time is by far the most popular time signature and to make
  mashup creation a more streamlined effort.
- Search [YouTube](https://www.youtube.com/) using logic modified from [usetube](https://www.npmjs.com/package/usetube) for applicable videos that meet certain minimum standards (e.g. videos do not contain
  blacklisted terms either in their video title, video description title, channel name, or channel description) and contain closed-captions. The timestamped closed-captions
  available on these videos are then compared to lyrics found on [Genius](https://genius.com/) (acquired via the [Genius Lyrics API](https://www.npmjs.com/package/genius-lyrics-api))
  with a string and character comparison function that attributes timestamps to the various sections of the song.
- If a video with an adequate number of successfully timestamped song sections is found, its MP3 audio is downloaded using [yt-dlp](https://github.com/yt-dlp/yt-dlp). Audio is then trimmed to a maximum of 3 minutes long with [fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg).
- The MP3 audio is then split into instrumental and vocal stem MP3 files uploaded to an output AWS S3 bucket using a custom [Dockerized AWS Lambda function](https://github.com/amamenko/lambda-spleeter-docker) that relies on
  [Deezer's Spleeter](https://github.com/deezer/spleeter). Spleeter is a song separation library that uses pretrained models written in [Python](https://www.python.org/) and [Tensorflow](https://tensorflow.org/).
  Note that a local Node.js implementation of Spleeter is possible as [noted by my comment on this issue](https://github.com/deezer/spleeter/issues/358#issuecomment-914895894), however,
  Spleeter requires a substantial amount of RAM that quickly overwhelms an [AWC EC2 t2.micro instance](https://aws.amazon.com/ec2/instance-types/t2/). Even with [modular implementations](https://github.com/amo13/spleeter-wrapper) of Spleeter, the splitting process (even with a base 2-stem model) is memory-intensive.
- Every beat position of the instrumental stem MP3 file is then determined for [beatmatching](https://en.wikipedia.org/wiki/Beatmatching) purposes using the [essentia.js](https://mtg.github.io/essentia.js/) library.
- Vocal and accompaniment audio assets are uploaded to a Contentful CMS using Contentful's [Content Management API](https://www.npmjs.com/package/contentful-management). These assets are then associated with the song's entry. The enty is subsequently populated with all of the acquired data.

## Deployment

Server deployed via [AWS EC2](https://aws.amazon.com/ec2/) instance. Client-side website deployed with [Vercel](https://vercel.com/).

<!-- LICENSE -->

## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<!-- CONTACT -->

## Contact

Auto Mashup - automaticmashup@gmail.com

Avraham (Avi) Mamenko - avimamenko@gmail.com

Project Link: [https://github.com/amamenko/auto-mashup](https://github.com/amamenko/auto-mashup)

<!-- ACKNOWLEDGEMENTS -->

## Acknowledgements

- [YouTube](https://www.youtube.com/)
- [Billboard](https://www.billboard.com/)
- [Contentful](https://www.contentful.com/)
- [AWS](https://aws.amazon.com/)
- [node-cron](https://www.npmjs.com/package/node-cron)
- [Spotify](https://www.spotify.com/us/)
- [Genius](https://genius.com/)
- [FFMPEG](https://ffmpeg.org/)
- [fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- [essentia.js](https://mtg.github.io/essentia.js/)
- [usetube](https://www.npmjs.com/package/usetube)
- [billboard-top-100](https://www.npmjs.com/package/billboard-top-100)
- [Best-README-Template](https://github.com/othneildrew/Best-README-Template)

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[license-shield]: https://img.shields.io/github/license/othneildrew/Best-README-Template.svg?style=for-the-badge
[license-url]: https://github.com/amamenko/auto-mashup/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://www.linkedin.com/in/avrahammamenko
