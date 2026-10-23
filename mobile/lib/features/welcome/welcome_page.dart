import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../auth/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../theme/product_motion.dart';
import '../auth/auth_widgets.dart';
import '../auth/login_page.dart';
import '../auth/register_page.dart';

/// Public welcome; no account data or invented emergency statistics appear here.
class WelcomePage extends StatelessWidget {
  const WelcomePage({super.key});
  void _open(BuildContext context, Widget screen) => Navigator.of(
    context,
  ).push(MaterialPageRoute<void>(builder: (_) => screen));
  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    return Scaffold(
      body: SafeArea(
        child: ListView(
          children: [
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1120),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 20,
                  ),
                  child: Row(
                    children: [
                      const RescueMark(),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'Rescue Reports',
                          style: TextStyle(
                            fontSize: 19,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: () => _open(context, const LoginPage()),
                        child: const Text('Sign in'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1120),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 18, 24, 30),
                  child: LayoutBuilder(
                    builder: (context, box) {
                      final introduction = ProductArrival(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Semantics(
                              header: true,
                              child: Text(
                                'A clear report.\nA connected\nresponse.',
                                style: TextStyle(
                                  fontSize: box.maxWidth > 760 ? 58 : 43,
                                  height: 1.06,
                                  letterSpacing: -1.5,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.text,
                                ),
                              ),
                            ),
                            const SizedBox(height: 22),
                            const Text(
                              'Share what is happening and where. Follow the next step, from your first report to the latest response update.',
                              style: TextStyle(
                                fontSize: 16,
                                height: 1.6,
                                color: AppColors.muted,
                              ),
                            ),
                            const SizedBox(height: 24),
                            if (auth.error != null)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 16),
                                child: InlineError(
                                  failureMessage(auth.error!, auth.errorDetail),
                                ),
                              ),
                            SizedBox(
                              width: double.infinity,
                              child: FilledButton.icon(
                                onPressed: () =>
                                    _open(context, const RegisterPage()),
                                icon: const Icon(Icons.arrow_forward),
                                label: const Text('Create a resident account'),
                              ),
                            ),
                            const SizedBox(height: 10),
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton(
                                onPressed: () =>
                                    _open(context, const LoginPage()),
                                child: const Text('I already have an account'),
                              ),
                            ),
                          ],
                        ),
                      );
                      const scene = _ConnectionScene();
                      if (box.maxWidth >= 760) {
                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Expanded(child: introduction),
                            const SizedBox(width: 56),
                            const Expanded(child: scene),
                          ],
                        );
                      }
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          introduction,
                          const SizedBox(height: 28),
                          scene,
                        ],
                      );
                    },
                  ),
                ),
              ),
            ),
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1120),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const DisclaimerBox(),
                      const SizedBox(height: 32),
                      Semantics(
                        header: true,
                        child: Text(
                          'Useful details.\nLess uncertainty.',
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                      ),
                      const SizedBox(height: 22),
                      const _Feature(
                        icon: Icons.location_on_outlined,
                        title: 'Start with the location',
                        detail:
                            'Use GPS or choose a place on the map so staff can understand where help is needed.',
                      ),
                      const _Feature(
                        icon: Icons.add_photo_alternate_outlined,
                        title: 'Show what is happening',
                        detail:
                            'Add a description, photos when available, and a way for the response team to reach you.',
                      ),
                      const _Feature(
                        icon: Icons.notifications_active_outlined,
                        title: 'Follow the response',
                        detail:
                            'Keep your report reference and check your status and notifications as the situation changes.',
                      ),
                      const SizedBox(height: 18),
                      const Divider(),
                      const SizedBox(height: 8),
                      Text(
                        'Part of the response team?',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Sign in with your assigned account to see your rescue assignments.',
                        style: TextStyle(color: AppColors.muted, height: 1.5),
                      ),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: TextButton.icon(
                          onPressed: () => _open(context, const LoginPage()),
                          icon: const Icon(Icons.badge_outlined),
                          label: const Text('Response team sign in'),
                        ),
                      ),
                      const SizedBox(height: 20),
                      const Text(
                        'Rescue Reports',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Report clearly. Respond together.',
                        style: TextStyle(color: AppColors.muted),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class RescueMark extends StatelessWidget {
  const RescueMark({super.key, this.size = 40});
  final double size;
  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(Icons.add, color: Colors.white, size: size * .7),
    ),
  );
}

class _Feature extends StatelessWidget {
  const _Feature({
    required this.icon,
    required this.title,
    required this.detail,
  });
  final IconData icon;
  final String title, detail;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 24),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: AppColors.primary, size: 25),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 6),
              Text(
                detail,
                style: const TextStyle(color: AppColors.muted, height: 1.6),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _ConnectionScene extends StatefulWidget {
  const _ConnectionScene();
  @override
  State<_ConnectionScene> createState() => _ConnectionSceneState();
}

class _ConnectionSceneState extends State<_ConnectionScene>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  );
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller.value = 1;
    } else if (_controller.status == AnimationStatus.dismissed) {
      _controller.forward();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(24),
    decoration: BoxDecoration(
      color: AppColors.harbor,
      borderRadius: BorderRadius.circular(16),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          header: true,
          child: const Text(
            'From report to response',
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const SizedBox(height: 10),
        const Text(
          'Your information connects the next step.',
          style: TextStyle(color: Color(0xFFDAD2EA), height: 1.5),
        ),
        const SizedBox(height: 20),
        Semantics(
          label:
              'A report is reviewed by dispatch and connected to a response team.',
          child: ExcludeSemantics(
            child: RepaintBoundary(
              child: AnimatedBuilder(
                animation: _controller,
                builder: (_, _) => SizedBox(
                  height: 180,
                  child: CustomPaint(
                    painter: _ConnectionPainter(
                      Curves.easeOutCubic.transform(_controller.value),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 20),
        Wrap(
          spacing: 14,
          runSpacing: 14,
          children: const [
            _SceneLabel(icon: Icons.edit_location_alt_outlined, text: 'Report'),
            _SceneLabel(icon: Icons.fact_check_outlined, text: 'Review'),
            _SceneLabel(icon: Icons.groups_outlined, text: 'Respond'),
          ],
        ),
      ],
    ),
  );
}

class _SceneLabel extends StatelessWidget {
  const _SceneLabel({required this.icon, required this.text});
  final IconData icon;
  final String text;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, color: const Color(0xFFCBB4FF), size: 18),
      const SizedBox(width: 7),
      Text(text, style: const TextStyle(color: Colors.white, fontSize: 14)),
    ],
  );
}

class _ConnectionPainter extends CustomPainter {
  const _ConnectionPainter(this.progress);
  final double progress;
  @override
  void paint(Canvas canvas, Size size) {
    final road = Paint()
      ..color = const Color(0xFF3C2D59)
      ..strokeWidth = 16
      ..strokeCap = StrokeCap.round;
    for (final x in [.12, .48, .86]) {
      canvas.drawLine(
        Offset(size.width * x, 8),
        Offset(size.width * x, size.height - 8),
        road,
      );
    }
    for (final y in [.22, .78]) {
      canvas.drawLine(
        Offset(4, size.height * y),
        Offset(size.width - 4, size.height * y),
        road,
      );
    }
    final start = Offset(size.width * .12, size.height * .22),
        mid = Offset(size.width * .48, size.height * .78),
        end = Offset(size.width * .86, size.height * .78);
    final path = Path()
      ..moveTo(start.dx, start.dy)
      ..lineTo(mid.dx, start.dy)
      ..lineTo(mid.dx, mid.dy)
      ..lineTo(end.dx, end.dy);
    final metric = path.computeMetrics().first;
    canvas.drawPath(
      metric.extractPath(0, metric.length * progress),
      Paint()
        ..color = const Color(0xFFCBB4FF)
        ..strokeWidth = 4
        ..style = PaintingStyle.stroke
        ..strokeJoin = StrokeJoin.round,
    );
    for (final p in [start, mid, end]) {
      canvas.drawCircle(p, 12, Paint()..color = const Color(0xFFCBB4FF));
      canvas.drawCircle(p, 5, Paint()..color = AppColors.harbor);
    }
  }

  @override
  bool shouldRepaint(_ConnectionPainter old) => old.progress != progress;
}
