import "dart:convert";

import "package:flutter/cupertino.dart";
import 'package:photos/models/metadata/common_keys.dart';

const editTimeKey = 'editedTime';
const editNameKey = 'editedName';
const captionKey = "caption";
const uploaderNameKey = "uploaderName";
const widthKey = 'w';
const heightKey = 'h';
const mediaTypeKey = 'mediaType';
const latKey = "lat";
const longKey = "long";
const motionVideoIndexKey = "mvi";
const noThumbKey = "noThumb";
const previewWidthKey = "previewWidth";
const previewHeightKey = "previewHeight";
const previewSizeKey = "previewSize";

class MagicMetadata {
  // 0 -> visible
  // 1 -> archived
  // 2 -> hidden etc?
  int visibility;

  MagicMetadata({required this.visibility});

  factory MagicMetadata.fromEncodedJson(String encodedJson) =>
      MagicMetadata.fromJson(jsonDecode(encodedJson));

  factory MagicMetadata.fromJson(dynamic json) => MagicMetadata.fromMap(json);

  static fromMap(Map<String, dynamic>? map) {
    if (map == null) return null;
    return MagicMetadata(
      visibility: map[magicKeyVisibility] ?? visibleVisibility,
    );
  }
}

class PubMagicMetadata {
  int? editedTime;
  String? editedName;
  String? caption;
  String? uploaderName;
  int? w;
  int? h;
  double? lat;
  double? long;

  // Motion Video Index. Positive value (>0) indicates that the file is a motion
  // photo
  int? mvi;

  // if true, then the thumbnail is not available
  // Note: desktop/web sets hasStaticThumbnail in the file metadata.
  // As we don't want to support updating the og file metadata (yet), adding
  // this new field to the pub metadata. For static thumbnail, all thumbnails
  // should have exact same hash with should match the constant `blackThumbnailBase64`
  bool? noThumb;

  // null -> not computed
  // 0 -> normal
  // 1 -> panorama
  int? mediaType;

  // preview related metadata for videos
  int? previewWidth;
  int? previewHeight;
  int? previewSize;

  PubMagicMetadata({
    this.editedTime,
    this.editedName,
    this.caption,
    this.uploaderName,
    this.w,
    this.h,
    this.lat,
    this.long,
    this.mvi,
    this.noThumb,
    this.mediaType,
    this.previewWidth,
    this.previewHeight,
    this.previewSize,
  });

  factory PubMagicMetadata.fromEncodedJson(String encodedJson) =>
      PubMagicMetadata.fromJson(jsonDecode(encodedJson));

  factory PubMagicMetadata.fromJson(dynamic json) =>
      PubMagicMetadata.fromMap(json);

  static fromMap(Map<String, dynamic>? map) {
    if (map == null) return null;
    return PubMagicMetadata(
      editedTime: map[editTimeKey],
      editedName: map[editNameKey],
      caption: map[captionKey],
      uploaderName: map[uploaderNameKey],
      w: safeParseInt(map[widthKey], widthKey),
      h: safeParseInt(map[heightKey], heightKey),
      lat: map[latKey],
      long: map[longKey],
      mvi: map[motionVideoIndexKey],
      noThumb: map[noThumbKey],
      mediaType: map[mediaTypeKey],
      previewWidth: map[previewWidthKey],
      previewHeight: map[previewHeightKey],
      previewSize: map[previewSizeKey],
    );
  }

  static int? safeParseInt(dynamic value, String key) {
    if (value == null) return null;
    if (value is int) return value;
    debugPrint("PubMagicMetadata key: $key Unexpected value: $value");
    if (value is String) return int.tryParse(value);
    return null;
  }
}
