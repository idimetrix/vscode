/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/base/common/event';
import { DisposableStore } from 'vs/base/common/lifecycle';
import { Dimension } from 'vs/base/browser/dom';
import { Orientation, Sash } from 'vs/base/browser/ui/sash/sash';


export interface IResizeEvent {
	dimenion: Dimension;
	done: boolean;
}

export class ResizableHTMLElement {

	readonly domNode: HTMLElement;

	private readonly _onDidWillResize = new Emitter<void>();
	readonly onDidWillResize: Event<void> = this._onDidWillResize.event;

	private readonly _onDidResize = new Emitter<IResizeEvent>();
	readonly onDidResize: Event<IResizeEvent> = this._onDidResize.event;

	private readonly _eastSash: Sash;
	private readonly _southSash: Sash;
	private readonly _sashListener = new DisposableStore();

	private _size?: Dimension;

	constructor() {
		this.domNode = document.createElement('div');
		this._eastSash = new Sash(this.domNode, { getVerticalSashLeft: () => this._size?.width ?? 0 }, { orientation: Orientation.VERTICAL });
		this._southSash = new Sash(this.domNode, { getHorizontalSashTop: () => this._size?.height ?? 0 }, { orientation: Orientation.HORIZONTAL });

		this._eastSash.orthogonalEndSash = this._southSash;
		this._southSash.orthogonalEndSash = this._eastSash;

		let currentSize: Dimension | undefined;
		let deltaY = 0;
		let deltaX = 0;

		this._sashListener.add(Event.any(this._eastSash.onDidStart, this._southSash.onDidStart)(() => {
			this._onDidWillResize.fire();
			currentSize = this._size;
			deltaY = 0;
			deltaX = 0;
		}));
		this._sashListener.add(Event.any(this._eastSash.onDidEnd, this._southSash.onDidEnd)(() => {
			currentSize = undefined;
			deltaY = 0;
			deltaX = 0;
			this._onDidResize.fire({ dimenion: this._size!, done: false });
		}));

		this._sashListener.add(this._southSash.onDidChange(e => {
			if (currentSize) {
				deltaY = e.currentY - e.startY;
				this.layout(currentSize.height + deltaY, currentSize.width + deltaX);
				this._onDidResize.fire({ dimenion: this._size!, done: false });
			}
		}));
		this._sashListener.add(this._eastSash.onDidChange(e => {
			if (currentSize) {
				deltaX = e.currentX - e.startX;
				this.layout(currentSize.height + deltaY, currentSize.width + deltaX);
				this._onDidResize.fire({ dimenion: this._size!, done: false });
			}
		}));
	}

	dispose(): void {
		this._southSash.dispose();
		this._eastSash.dispose();
		this._sashListener.dispose();
		this.domNode.remove();
	}

	layout(height: number, width: number): void {
		const newSize = new Dimension(width, height);
		if (!Dimension.equals(newSize, this._size)) {
			this.domNode.style.height = height + 'px';
			this.domNode.style.width = width + 'px';
			this._size = newSize;
			this._southSash.layout();
			this._eastSash.layout();
		}
	}
}
