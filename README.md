[![MIT License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]



<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="https://github.com/amamenko/GlowLabs">
    <img src="https://images.ctfassets.net/r8d0zt89au6z/3RAHaHvXM719XrM7JKoyxB/a078e6a8e5e8d019de03ede83502025b/automashup_logo.jpg" alt="Logo" width="200" />
  </a>

  <h3 align="center">Auto Mashup</h3>

  <p align="center">
    Automated Music Mashups Created with Node.js
    <br />
    Featuring Songs from Today's Billboard Charts
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

A [mashup](https://en.wikipedia.org/wiki/Mashup_(music)), according to [Merriam-Webster's Dictionary](https://www.merriam-webster.com/dictionary/mash-up), is "a piece of music created by digitally overlaying 
an instrumental track with a vocal track from a different recording." The idea of mashups has been around since the late 1960s - the first such creation, arguably,
was found on Harry Nilsson's 1967 album [Pandemonium Shadow Show](https://en.wikipedia.org/wiki/Pandemonium_Shadow_Show), which features a cover of the Beatles' 
["You Can't Do That"](https://en.wikipedia.org/wiki/You_Can%27t_Do_That) with his own vocal recreations of more than a dozen other Beatles songs on the same instrumental track.

Ideally, the vocal track of one song is superimposed seamlessly onto the instrumental track of a separate song, [modifying](https://en.wikipedia.org/wiki/Pitch_shift) 
the musical keys and tempos where necessary to achieve a perfect mix. Often, when selecting songs for a mashup, mashup creators search for songs that have similar
[musical keys](https://en.wikipedia.org/wiki/Key_(music)), [tempos](https://en.wikipedia.org/wiki/Tempo), and [modes](https://en.wikipedia.org/wiki/Mode_(music)).
This not only allows for a better-sounding mix, but increases the audience's ability to recognize distinct elements of both selected songs, while avoiding something like a
"chipmunk"-sounding effect on the audio.

Indeed, due to the fact that there are only so many chords, keys, tempos, song structures, time signatures, and modes, popular songs on the [Billboard](https://www.billboard.com/) 
charts can, and often do, sound alike. The weekly [Billboard magazine](https://en.wikipedia.org/wiki/Billboard_(magazine)) tracks the most popular trending songs 
across various genres of music and displays various charts containing music rankings on their [website]((https://www.billboard.com/)). Charts include 
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

## Functionality

Auto Mashup project spans two repositories. 

The first repository ([the one you are visiting right now](https://github.com/amamenko/auto-mashup)) represents
the [Node.js](https://nodejs.org/en/) and [Express](https://expressjs.com/) server that handles the weekly regular Billboard chart scraping, monthly GOAT 
Billboard chart scraping, individual song data/audio stem acquisition logic, and writing to a [Contentful Content Management System](https://www.contentful.com/). 

The second repository 
([https://github.com/amamenko/auto-mashup-mix](https://github.com/amamenko/auto-mashup-mix)) contains both the client-side website logic of [automashup.ml](https://www.automashup.ml/)
(built with [React](https://reactjs.org/)) and the Node.js/Express server that uses the song data acquired in Contentful to find and create automated song mashups
with [FFMPEG](https://ffmpeg.org/) and create and upload a weekly video of mashups to the [Auto Mashup YouTube channel](https://www.youtube.com/channel/UCbjaDBiyXCqWGT4inY8LCmQ)
and a post to the [@automaticmashup Instagram page](https://www.instagram.com/automaticmashup/).

The basic functionality of this repository's code logic is: 

<strong>Billboard Chart Scraping:</strong>
* Use [cheerio](https://www.npmjs.com/package/cheerio) to scrape song position data from charts on [billboard.com](https://www.billboard.com/) using logic modified from [billboard-top-100](https://www.npmjs.com/package/billboard-top-100).
* Scrape regular Billboard charts via a CRON job set up by [node-cron](https://www.npmjs.com/package/node-cron) every Tuesday/Wednesday and greatest-of-all-time Billboard charts on the first Sunday of every month.
* Remove any old entries and their associated instrumental and accompaniment audio assets if the song is no longer present on any Billboard chart.

<strong>Song Data Acquisition:</strong>
* Use the [Spotify Web API](https://www.npmjs.com/package/spotify-web-api-node) to get an audio analysis for every track on the Billboard chart with a Spotify 
song ID (noting the song's tempo, key, and mode, in addition to the track name and artist name). Songs with a time signature other than 
[4/4 (common time)](https://en.wikipedia.org/wiki/Time_signature#common_time) are excluded since 4/4 time is by far the most popular time signature and to make 
mashup creation a more streamlined effort.
* Search [YouTube](https://www.youtube.com/) using logic modified from [usetube](https://www.npmjs.com/package/usetube) for applicable videos that meet certain minimum standards (e.g. videos do not contain 
blacklisted terms either in their video title, video description title, channel name, or channel description) and contain closed-captions. The timestamped closed-captions
available on these videos are then compared to lyrics found on [Genius](https://genius.com/) (acquired via the [Genius Lyrics API](https://www.npmjs.com/package/genius-lyrics-api))
with a string and character comparison function that attributes timestamps to the various sections of the song.
* If a video with an adequate number of successfully timestamped song sections is found, the MP3 audio if it is download using a [Puppeteer](https://www.npmjs.com/package/puppeteer)
script that accesses [320ytmp3.com](https://320ytmp3.com). Audio is then trimmed to a maximum of 4 minutes long with [fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg).
* The MP3 audio is then split into instrumental and vocal stem MP3 files using a third-party website that relies on 
[Deezer's Spleeter](https://github.com/deezer/spleeter) song separation library that uses pretrained models written in [Python](https://www.python.org/) that uses [Tensorflow](https://tensorflow.org/).
Note that a local Node.js implementation of Spleeter is possible as [noted by my comment on this issue](https://github.com/deezer/spleeter/issues/358#issuecomment-914895894), however,
Spleeter requires a substantial amount of RAM that quickly overwhelms an [AWC EC2 t2.micro instance](https://aws.amazon.com/ec2/instance-types/t2/).
* Every beat position of the instrumental stem MP3 file is then determined for [beatmatching](https://en.wikipedia.org/wiki/Beatmatching) purposes using the [essentia.js](https://mtg.github.io/essentia.js/) library.
* Vocal and accompaniment audio assets are uploaded to a Contentful CMS using Contentful's [Content Management API](https://www.npmjs.com/package/contentful-management) 
and associated with the song's entry that is subsequently populated with all of the acquired data.

## Deployment

Server deployed via [AWS EC2](https://aws.amazon.com/ec2/) instance. Client-side website deployed with [Vercel](https://vercel.com/). Custom domain from [Freenom](https://www.freenom.com/) with DNS routing by [Cloudflare](https://www.cloudflare.com/).


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
* [YouTube](https://www.youtube.com/)
* [Billboard](https://www.billboard.com/)
* [Contentful](https://www.contentful.com/)
* [node-cron](https://www.npmjs.com/package/node-cron)
* [Spotify](https://www.spotify.com/us/) 
* [Genius](https://genius.com/)
* [FFMPEG](https://ffmpeg.org/)
* [fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg)
* [essentia.js](https://mtg.github.io/essentia.js/)
* [usetube](https://www.npmjs.com/package/usetube)
* [billboard-top-100](https://www.npmjs.com/package/billboard-top-100)
* [Best-README-Template](https://github.com/othneildrew/Best-README-Template)


<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[license-shield]: https://img.shields.io/github/license/othneildrew/Best-README-Template.svg?style=for-the-badge
[license-url]: https://github.com/amamenko/auto-mashup/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://www.linkedin.com/in/avrahammamenko
