# youtube-transcript

Search youtube videos based on text

# How does this work?

It's quite simple, if you're using the hosted version of this (Up at https://transcript.editid.uk as of 12/07/2025), you just enter the term you want to search videos for, and it will list all videos that mention that term sorted by most appearances. If you search multiple, it acts as if you searched each word seperately and combines listings.

## Strict mode

Strict mode simply means that if you enter multiple terms, if will only return videos that have at least 1 of each of the terms, whilst without it enabled, if you searched "the fox", all videos mentioning the word "the", and all videos mentioning the word "fox" would show up, whilst if it's enabled, only videos that mention both "the" and "fox" would show up.

## AI Usage

What did I use AI to do? I wrote this readme myself, almost all of the logic in the nextjs site was written by me, some of the functions related to handling data from the database were written using AI for tab complete, as it's quite repetative. The python logic for the downloader and transcriber was written by me (Not the packages I used). I did not use AI for any art, as there is no art. I have also used AI for most of the commit messages, as I don't know what to put in the commit message usually.

### Notes

I have a `.env` file at the root of the project, and a symlink for the file at the root of the nextjs project (in the frontend folder), this makes it easier for me to only have to update one `.env` file.
