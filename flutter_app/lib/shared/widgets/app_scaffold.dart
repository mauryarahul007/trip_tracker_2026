import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// AppScaffold enforces safe area, responsive keyboard insets,
/// and consistent background styling across all views.
class AppScaffold extends StatelessWidget {
  final Widget body;
  final PreferredSizeWidget? appBar;
  final Widget? bottomNavigationBar;
  final Widget? floatingActionButton;
  final bool resizeToAvoidBottomInset;
  final Color? backgroundColor;

  /// Whether the body keeps clear of the status bar. Null = yes when there is no app bar. Screens that paint their own
  /// full-bleed background (the card-stack Trips home) pass false and inset their content themselves.
  final bool? safeTop;

  /// Caps the body width on wide windows (web / tablet) and centres it. Null = full width.
  final double? maxContentWidth;

  const AppScaffold({
    super.key,
    required this.body,
    this.appBar,
    this.bottomNavigationBar,
    this.floatingActionButton,
    this.resizeToAvoidBottomInset = true,
    this.backgroundColor,
    this.safeTop,
    this.maxContentWidth = 960,
  });

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return Scaffold(
      appBar: appBar,
      backgroundColor: backgroundColor ?? tokens.bgPage,
      resizeToAvoidBottomInset: resizeToAvoidBottomInset,
      body: SafeArea(
        top: safeTop ?? appBar == null,
        bottom: bottomNavigationBar == null,
        child: maxContentWidth == null
            ? body
            : Align(
                alignment: Alignment.topCenter,
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: maxContentWidth!),
                  child: body,
                ),
              ),
      ),
      bottomNavigationBar: bottomNavigationBar,
      floatingActionButton: floatingActionButton,
    );
  }
}

/// Teal gradient header band (web `--header-gradient-solid`) with light text; place at the
/// top of a screen body in place of a plain white AppBar.
class AppGradientHeader extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;

  const AppGradientHeader({super.key, required this.child, this.padding = const EdgeInsets.fromLTRB(20, 16, 20, 20)});

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: tokens.headerGradient,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(tokens.radiusLg)),
        boxShadow: tokens.shadowMd,
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: padding,
          child: DefaultTextStyle.merge(
            style: const TextStyle(color: Colors.white),
            child: IconTheme.merge(
              data: const IconThemeData(color: Colors.white),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}
