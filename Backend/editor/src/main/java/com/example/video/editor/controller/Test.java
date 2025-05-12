package com.example.video.editor.controller;

import java.util.function.BiConsumer;

import org.springframework.stereotype.Service;

import com.example.video.editor.service.progess.ProgressTask;

@Service
public class Test extends ProgressTask {

	@Override
	protected void executeTask(BiConsumer<Integer, String> progressCallback,
			BiConsumer<Object, String> completeCallback, BiConsumer<String, String> errorCallback, Object... params)
			throws Exception {
		progressCallback.accept(10, "okok");
		Thread.sleep(5000);
		System.out.println("okokok");

	}

}
