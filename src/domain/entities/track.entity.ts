export interface TrackProperties {
	artist: string;
	title: string;
	album?: string;
	durationMs: number;
}

export class TrackEntity {
	public readonly properties: TrackProperties;

	public constructor(properties: TrackProperties) {
		this.properties = properties;
	}
}