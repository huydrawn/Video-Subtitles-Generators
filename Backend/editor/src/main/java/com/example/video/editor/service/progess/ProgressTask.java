package com.example.video.editor.service.progess;

import java.util.function.BiConsumer;

public abstract class ProgressTask {

	protected abstract void executeTask(BiConsumer<Integer, String> progressCallback,
			BiConsumer<Object, String> completeCallback, BiConsumer<String, String> errorCallback, Object... params)
			throws Exception;

	protected Object[] getParams() {
		return new Object[0];
	}
}