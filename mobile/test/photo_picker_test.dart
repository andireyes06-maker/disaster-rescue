import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/data/services.dart';
import 'package:disaster_rescue/features/report/photo_picker.dart';
import 'report_fakes.dart';

Future<void> open(
  WidgetTester tester,
  FakePhotoService service, {
  List<PickedPhoto>? initial,
}) async {
  var photos = initial ?? <PickedPhoto>[];
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: StatefulBuilder(
          builder: (context, setState) => SingleChildScrollView(
            child: PhotoPickerSection(
              service: service,
              photos: photos,
              onChanged: (next) => setState(() => photos = next),
            ),
          ),
        ),
      ),
    ),
  );
}

class CameraPicker extends ImagePicker {
  XFile? result;
  ImageSource? receivedSource;
  double? width;
  bool? metadata;
  @override
  Future<XFile?> pickImage({
    required ImageSource source,
    double? maxWidth,
    double? maxHeight,
    int? imageQuality,
    CameraDevice preferredCameraDevice = CameraDevice.rear,
    bool requestFullMetadata = true,
  }) async {
    receivedSource = source;
    width = maxWidth;
    metadata = requestFullMetadata;
    return result;
  }
}

void main() {
  test(
    'camera service uses the camera source and preserves bytes for report identity',
    () async {
      final picker = CameraPicker()
        ..result = XFile.fromData(
          Uint8List.fromList([255, 216, 255, 0]),
          name: 'camera.jpg',
          mimeType: 'image/jpeg',
        );
      final service = ImagePickerPhotoService(picker: picker);
      final photos = await service.capture();
      expect(picker.receivedSource, ImageSource.camera);
      expect(picker.width, 2048);
      expect(picker.metadata, isFalse);
      expect(photos.single.bytes, [255, 216, 255, 0]);
      picker.result = null;
      expect(await service.capture(), isEmpty);
    },
  );

  testWidgets('camera and existing photos add to the same attachment list', (
    tester,
  ) async {
    final service = FakePhotoService()..next = [photo('fresh.jpg')];
    await open(tester, service);
    await tester.tap(find.text('Take photo'));
    await tester.pumpAndSettle();
    expect(service.cameraCalls, 1);
    expect(service.calls, 0);
    expect(find.text('fresh.jpg'), findsOneWidget);
    service.next = [photo('existing.jpg')];
    await tester.tap(find.text('Choose existing photos'));
    await tester.pumpAndSettle();
    expect(find.text('fresh.jpg'), findsOneWidget);
    expect(find.text('existing.jpg'), findsOneWidget);
  });

  testWidgets(
    'camera denial or cancellation keeps attachments and gallery usable',
    (tester) async {
      final service = FakePhotoService()
        ..cameraError = Exception('permission denied');
      await open(tester, service, initial: [photo('kept.jpg')]);
      await tester.tap(find.text('Take photo'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Check camera permission'), findsOneWidget);
      expect(find.text('kept.jpg'), findsOneWidget);
      service.cameraError = null;
      service.next = [];
      await tester.tap(find.text('Take photo'));
      await tester.pumpAndSettle();
      expect(find.text('kept.jpg'), findsOneWidget);
      expect(
        tester
            .widget<OutlinedButton>(
              find.widgetWithText(OutlinedButton, 'Choose existing photos'),
            )
            .onPressed,
        isNotNull,
      );
    },
  );

  testWidgets('capture uses file validation and the shared five-photo bound', (
    tester,
  ) async {
    final service = FakePhotoService()
      ..next = [
        PickedPhoto(
          name: 'invalid.jpg',
          bytes: Uint8List(0),
          mime: 'image/jpeg',
        ),
      ];
    await open(tester, service);
    await tester.tap(find.text('Take photo'));
    await tester.pumpAndSettle();
    expect(find.textContaining('It was not added.'), findsOneWidget);
    expect(find.byKey(const ValueKey('photo-chip-0')), findsNothing);
    await tester.pumpWidget(const SizedBox.shrink());
    await open(
      tester,
      service,
      initial: [for (var i = 0; i < 5; i++) photo('kept$i.jpg')],
    );
    final before = service.cameraCalls;
    await tester.tap(find.text('Take photo'));
    await tester.pumpAndSettle();
    expect(service.cameraCalls, before);
    expect(find.textContaining('up to 5 photos'), findsOneWidget);
  });

  testWidgets('pending capture blocks repeat activation and removal', (
    tester,
  ) async {
    final service = FakePhotoService()
      ..cameraPending = Completer<List<PickedPhoto>>();
    await open(tester, service, initial: [photo('kept.jpg')]);
    await tester.tap(find.text('Take photo'));
    await tester.pump();
    expect(service.cameraCalls, 1);
    expect(
      tester
          .widget<OutlinedButton>(
            find.widgetWithText(OutlinedButton, 'Take photo'),
          )
          .onPressed,
      isNull,
    );
    expect(
      tester
          .widget<IconButton>(
            find.byWidgetPredicate(
              (widget) =>
                  widget is IconButton &&
                  widget.tooltip == 'Remove photo kept.jpg',
            ),
          )
          .onPressed,
      isNull,
    );
    service.cameraPending!.complete([photo('captured.jpg')]);
    await tester.pumpAndSettle();
    expect(find.text('kept.jpg'), findsOneWidget);
    expect(find.text('captured.jpg'), findsOneWidget);
  });
}
