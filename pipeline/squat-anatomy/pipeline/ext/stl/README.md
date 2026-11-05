# BodyParts3D STLs (not committed)

The pipeline reads 14 BodyParts3D STL files from this folder (about 15 MB). **Every
build needs them,** including `build3.py`, because `kin3.py` loads some of them. They
aren't committed, so fetch them first:

```bash
scripts/fetch_stl.sh
```

The script clones `Kevin-Mattheus-Moerman/BodyParts3D` without blobs and copies out
only these 14 files. On 2026-11-04 the fetched files were byte-identical to the
originals in the archive release (see `../../../ARCHIVE.md`).

BodyParts3D © DBCLS, CC BY-SA 2.1 JP.
