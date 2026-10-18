import 'package:disaster_rescue/features/report/report_flow_page.dart';
import 'package:disaster_rescue/features/map/incident_map_page.dart';
import 'package:disaster_rescue/data/report_models.dart';
import 'package:flutter/material.dart';
import 'dart:ui' show SemanticsAction;
import 'package:disaster_rescue/features/report/hotline_button.dart';
import 'package:flutter_test/flutter_test.dart';
import '/Users/rien/Documents/FINAL_PROJECT/mobile/test/report_fakes.dart';
void main(){
 testWidgets('hotline exposed to screen reader tap', (t) async {
 final env=Env(); addTearDown(env.dispose); final semantics=t.ensureSemantics(); addTearDown(semantics.dispose);
 await t.pumpWidget(env.host(const Scaffold(body:HotlineButton()))); await t.pumpAndSettle();
 expect(t.getSemantics(find.byType(HotlineButton)).getSemanticsData().hasAction(SemanticsAction.tap),isTrue);
 });

 testWidgets('incident category exposed to screen reader tap', (t) async {
 final env=Env(); addTearDown(env.dispose); final semantics=t.ensureSemantics(); addTearDown(semantics.dispose);
 await t.pumpWidget(env.host(const ReportFlowPage())); await t.pumpAndSettle();
 expect(t.getSemantics(find.text('Flood')).getSemanticsData().hasAction(SemanticsAction.tap),isTrue);
 });
 testWidgets('320px 2x type grid does not overflow' , (t) async {
 final env=Env(); addTearDown(env.dispose); t.view.physicalSize=const Size(320,640); t.view.devicePixelRatio=1; addTearDown(t.view.reset);
 await t.pumpWidget(env.host(const ReportFlowPage(),textScale:2)); await t.pumpAndSettle(); expect(t.takeException(),isNull);
 });
 testWidgets('landscape incident map does not overflow', (t) async {
 t.view.physicalSize=const Size(640,320); t.view.devicePixelRatio=1; addTearDown(t.view.reset);
 await t.pumpWidget(MaterialApp(home:IncidentMapPage(reports:Stream.value(<AssignedReport>[]),viewerUid:'demo',showTiles:false))); await t.pumpAndSettle(); expect(t.takeException(),isNull);
 });
}
