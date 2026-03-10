// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Talenta Clone';

  @override
  String get menuHome => 'Home';

  @override
  String get menuAttendance => 'Attendance';

  @override
  String get menuHistory => 'History';

  @override
  String get menuProfile => 'Profile';

  @override
  String get loginTitle => 'Sign In';

  @override
  String get loginEmail => 'Email';

  @override
  String get loginPassword => 'Password';

  @override
  String get loginButton => 'SIGN IN';

  @override
  String get payrollDetail => 'Payroll Slip Details';

  @override
  String get netSalary => 'Net Salary';
}
