import 'package:flutter/material.dart';

/// A bounded arrival. Data refreshes don't restart it; new content may use a new key.
class ProductArrival extends StatefulWidget {
  const ProductArrival({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 320),
    this.distance = 12,
  });
  final Widget child;
  final Duration duration;
  final double distance;
  @override
  State<ProductArrival> createState() => _ProductArrivalState();
}

class _ProductArrivalState extends State<ProductArrival>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: widget.duration,
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
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _controller,
    child: widget.child,
    builder: (_, child) {
      final t = Curves.easeOutCubic.transform(_controller.value);
      return Opacity(
        opacity: .8 + .2 * t,
        child: Transform.translate(
          offset: Offset(0, widget.distance * (1 - t)),
          child: child,
        ),
      );
    },
  );
}

/// Keeps drafts and scroll positions mounted. Only the selected page paints or ticks.
/// No outgoing page is retained across an account or access change.
class ProductTabHost extends StatefulWidget {
  const ProductTabHost({
    super.key,
    required this.index,
    required this.children,
  });
  final int index;
  final List<Widget> children;
  @override
  State<ProductTabHost> createState() => _ProductTabHostState();
}

class _ProductTabHostState extends State<ProductTabHost>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 240),
    value: 1,
  );
  @override
  void didUpdateWidget(ProductTabHost oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.index != widget.index) {
      if (MediaQuery.disableAnimationsOf(context)) {
        _controller.value = 1;
      } else {
        _controller.forward(from: 0);
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _controller,
    child: IndexedStack(
      index: widget.index,
      children: [
        for (var i = 0; i < widget.children.length; i++)
          TickerMode(enabled: i == widget.index, child: widget.children[i]),
      ],
    ),
    builder: (_, child) {
      final t = Curves.easeOutCubic.transform(_controller.value);
      return Transform.translate(
        offset: Offset(10 * (1 - t), 0),
        child: Opacity(opacity: .9 + .1 * t, child: child),
      );
    },
  );
}

class ProductPageTransitions extends PageTransitionsBuilder {
  const ProductPageTransitions();
  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (MediaQuery.disableAnimationsOf(context) || route.isFirst) return child;
    final curve = animation.drive(CurveTween(curve: Curves.easeOutCubic));
    return FadeTransition(
      opacity: curve.drive(Tween(begin: .85, end: 1)),
      child: SlideTransition(
        position: curve.drive(
          Tween(begin: const Offset(.035, 0), end: Offset.zero),
        ),
        child: child,
      ),
    );
  }
}
