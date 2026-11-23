import React, { useEffect, useId, useSyncExternalStore } from "react";
import {
  BackHandler,
  Keyboard,
  Modal as NativeModal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ModalProps,
} from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";
import {
  alertDialogQueue,
  type DialogButton,
} from "@/utils/alertDialogQueue";

export const Alert = {
  alert: (
    title: string,
    message?: string,
    buttons?: DialogButton[],
    options?: { cancelable?: boolean; onDismiss?: () => void },
  ) => {
    Keyboard.dismiss();
    return alertDialogQueue.show(title, message, buttons, options);
  },
};

function DialogLayer({ modalId }: { modalId?: string }) {
  const { height } = useWindowDimensions();
  const dialog = useSyncExternalStore(
    alertDialogQueue.subscribe,
    alertDialogQueue.getCurrent,
    alertDialogQueue.getCurrent,
  );
  const activeModalId = useSyncExternalStore(
    alertDialogQueue.subscribe,
    alertDialogQueue.getActiveModalId,
    alertDialogQueue.getActiveModalId,
  );
  const isTopLayer = (modalId ?? null) === activeModalId;

  useEffect(() => {
    if (!dialog || !isTopLayer) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (dialog.cancelable) alertDialogQueue.dismiss(dialog.id);
      return true;
    });
    return () => subscription.remove();
  }, [dialog, isTopLayer]);

  if (!dialog || !isTopLayer) return null;

  const horizontalActions = dialog.buttons.length <= 2;

  return (
    <View style={StyleSheet.absoluteFill} className="z-[10000] items-center justify-center bg-black/55 px-6" accessibilityViewIsModal>
      <Pressable
        accessibilityLabel="Dismiss dialog"
        style={StyleSheet.absoluteFill}
        onPress={() => {
          if (dialog.cancelable) alertDialogQueue.dismiss(dialog.id);
        }}
      />
      <View className="w-full max-w-[420px] overflow-hidden rounded-[28px] bg-white shadow-2xl" accessibilityRole="alert">
        <ScrollView
          style={{ maxHeight: Math.min(height * 0.62, 480) }}
          contentContainerStyle={{ padding: 24 }}
        >
          <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
            <Ionicons name="information-circle" size={27} color="#d97706" />
          </View>
          <Text className="text-lg font-poppin-bold leading-7 text-gray-950">{dialog.title}</Text>
          {dialog.message ? (
            <Text className="mt-2 text-sm font-poppin leading-6 text-gray-600">
              {dialog.message}
            </Text>
          ) : null}
        </ScrollView>
        <View className={`${horizontalActions ? "flex-row" : "flex-col"} gap-2 px-6 pb-6`}>
          {dialog.buttons.map((button, index) => {
            const destructive = button.style === "destructive";
            const cancel = button.style === "cancel";
            return (
              <Pressable
                key={`${dialog.id}-${index}`}
                accessibilityRole="button"
                onPress={() => alertDialogQueue.pressButton(dialog.id, index)}
                className={`min-h-12 flex-1 items-center justify-center rounded-2xl px-4 py-3 ${
                  destructive
                    ? "bg-red-600"
                    : cancel
                      ? "bg-gray-100"
                      : "bg-gray-950"
                }`}
              >
                <Text className={`text-sm font-poppin-semibold ${cancel ? "text-gray-700" : "text-white"}`}>
                  {button.text || "OK"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export function AlertDialogProvider({ children }: React.PropsWithChildren) {
  return (
    <View className="flex-1">
      {children}
      <DialogLayer />
    </View>
  );
}

export function DialogModal({ children, visible, onRequestClose, ...props }: ModalProps) {
  const modalId = useId();

  useEffect(() => {
    alertDialogQueue.setModalVisible(modalId, Boolean(visible));
    return () => alertDialogQueue.setModalVisible(modalId, false);
  }, [modalId, visible]);

  return (
    <NativeModal
      visible={visible}
      {...props}
      onRequestClose={(event) => {
        const dialog = alertDialogQueue.getCurrent();
        if (dialog && alertDialogQueue.getActiveModalId() === modalId) {
          if (dialog.cancelable) alertDialogQueue.dismiss(dialog.id);
          return;
        }
        onRequestClose?.(event);
      }}
    >
      <View className="flex-1">
        {children}
        {visible ? <DialogLayer modalId={modalId} /> : null}
      </View>
    </NativeModal>
  );
}