import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_repository.dart';
import 'providers.dart';

final authControllerProvider = AsyncNotifierProvider<AuthController, MeloraUser?>(AuthController.new);
class AuthController extends AsyncNotifier<MeloraUser?> {
  late AuthRepository _repository;
  @override
  Future<MeloraUser?> build() async {
    _repository = ref.watch(authRepositoryProvider);
    await _repository.listenForCallbacks(_handleCallback);
    return _repository.restoreSession();
  }
  Future<void> signIn() => _repository.startGoogleSignIn();
  Future<void> signOut() async {
    await _repository.signOut();
    state = const AsyncData(null);
  }
  Future<void> _handleCallback(Uri uri) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _repository.acceptCallback(uri));
  }
}
