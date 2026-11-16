Subject: Billed 1.139 GB of storage but storage.objects only accounts for 527 MB — old versions not reclaimed after upsert

Project ref: imkvoywmakzwcjvrlrfx (Free plan, grace period ends 16 Dec 2026)

We are being billed for storage that no longer exists in the metadata, and
we would like you to reclaim it or tell us how to.

WHAT WE DID
On 15-16 Nov 2026 we re-encoded 912 existing JPEG objects to WebP in the
browser and uploaded each one back to the SAME path:

  supabase.storage.from(bucket)
    .upload(path, webpBlob, { upsert: true, contentType: 'image/webp' });

Each new object is 40-60% smaller than the one it replaced. Nothing was
deleted at any point. We expected usage to drop by about 590 MB.

WHAT WE SEE
Usage has not moved: Storage Size 1.139 / 1 GB (114%), and the "Average
Storage Size per day" chart is flat at ~1.1 GB for both 15 and 16 Nov, i.e.
before and after the re-uploads.

But the metadata accounts for only 527 MB across all 1,914 objects:

  SELECT bucket_id, metadata->>'mimetype',
         count(*), pg_size_pretty(sum((metadata->>'size')::bigint))
    FROM storage.objects GROUP BY 1,2;

  loading-sheets   jpeg 471 158 MB | webp 781 145 MB
  turnaround-files jpeg 525 196 MB | webp 137  28 MB

So ~612 MB is billed but referenced by no row in storage.objects — almost
exactly the 590 MB the re-encoding should have saved.

OUR HYPOTHESIS
When an object is overwritten with upsert: true, the previous version is
dereferenced in the metadata but the underlying file is not reclaimed, so
those bytes keep counting towards usage while being invisible in SQL.

WHAT WE ASK
1. Could you reclaim the orphaned versions, so billed storage matches the
   527 MB that storage.objects accounts for?
2. Is this expected for upsert: true? If so it would be worth documenting:
   from the client, a successful upsert looks like a saving when it is
   actually an increase.
3. Does DELETE reclaim the bytes immediately, or leave the same residue?
   We are about to move these photos to external storage and delete them
   here, and we need to know whether deleting objects frees the space or
   whether we should delete the buckets entirely.

Thanks very much.
