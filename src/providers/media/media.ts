import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { VideoPlayer } from '@ionic-native/video-player';
import { FileTransfer, FileTransferObject, FileUploadResult } from '@ionic-native/file-transfer';
import 'rxjs/add/operator/map';

import { StorageProvider } from '../../providers/storage/storage';
import { AuthProvider } from '../../providers/auth/auth';
import { UtilitiesProvider } from '../../providers/utilities/utilities';

import { ServerResponseModel, ServerResponseInterface } from '../../app/models/ServerResponseModel';
import { SessionModel } from '../../app/models/SessionModel';

/*
  Plugin "Streaming Media"?
  Plugin "Media Capture -> CaptureVideo"?

  Plugin "Camera Preview"
  https://ionicframework.com/docs/native/camera-preview/

  "Video Capture Plus"
  https://ionicframework.com/docs/native/video-capture-plus/
*/

// URL for noProxy
const PROXY = "http://minden.froese-energieausholz.de:3000/api";
//const PROXY = "";
// File System Path
const PATH = "file:///android_asset/";

@Injectable()

/**
 * Die Klasse MediaProvider kümmert sich um alle Angelegenheiten, die sich mit Medien befassen.
 */
export class MediaProvider {

  constructor(private videoPlayer: VideoPlayer,
    public http: Http,
    private transfer: FileTransfer,
    public storage: StorageProvider,
    public authProvider: AuthProvider,
    public utilities: UtilitiesProvider) {
  }

  // Spielt das übergebene Video ab.
  playVideo(file: string) {
    return new Promise((resolve, reject) => {

      var filepath: string = "file:///android_asset/www/Video/" + file;

      this.videoPlayer.play(filepath).then(() => {
        resolve("Video " + file + " wird abgespielt.");
      }).catch(err => {
        reject(err);
      });
    });
  }

  // Lädt das übergebene Video auf den Server hoch.
  uploadVideo(filename: string) {
    return new Promise((resolve, reject) => {

      this.authProvider.getToken().then((token: SessionModel) => {

        var progress: number = 0;
        this.utilities.showLoader("Uploading Video.... <br> Upload bei: " + progress + "%");

        // Erzeugt ein Objekt, welches sich um den Dateitransfer zum Server kümmert.
        const fileTransfer: FileTransferObject = this.transfer.create();
        var options = {
          fileKey: "upfile",
          fileName: filename,
          chunkedMode: false,
          mimeType: "multipart/form-data",
          headers: { authorization: token.getSessionID() }
        };
        // Zeigt den Upload grafisch dar.
        fileTransfer.onProgress((e) => {
          if (progress < Math.round((e.loaded * 100) / e.total)) {
            progress = Math.round((e.loaded * 100) / e.total);
            this.utilities.setLoaderContent("Uploading Video.... <br> Upload bei: " + progress + "%");
          }
        });
        // Datei auf /upload hochladen
        fileTransfer.upload(PATH + "www/Video/" + filename, PROXY + "/upload", options).then((result: FileUploadResult) => {
          this.utilities.closeLoader();

          // JSON String parsen.
          let tempResponse: ServerResponseInterface = JSON.parse(result.response);
          // ServerResponseModel-Object erstellen.
          let response: ServerResponseModel = new ServerResponseModel(tempResponse.success, tempResponse.msg);

          // Server Response auswerten
          if (response.getMsg() === "Done! Uploading files") {
            console.log("StarDuell Successfully uploaded Video.");
            this.utilities.giveAlert("Upload erfolgreich!", "Das Video konnte erfolgreich auf den Server hochgeladen werden.");
            resolve("StarDuell Successfully uploaded Video.");
          } else {
            if (response.getMsg() === "No File selected!") {
              console.error("StarDuell: No File selected for upload!");
              this.utilities.giveAlert("Fehler!", "Keine Datei zum uploaden ausgewählt!");
            } else {
              console.error("StarDuell: Fehler beim Upload: " + response.getMsg());
              this.utilities.giveAlert("Fehler!", response.getMsg());
            }
          }
        }, (err) => {
          console.error("StarDuell: Fehler beim Upload: " + JSON.stringify(err).toString())
          this.utilities.closeLoader();
          reject(err);
        });

      }, (err: string) => {
        reject(err);
      });
    });
  }

  // Erzeugt eine Log-Ausgabe für jede Datei, die im Ordner "Video" existiert.
  listFilesInLog() {
    this.storage.getFileList("www/Video/").then((entries: string[]) => {
      entries.forEach(element => {
        console.error(element);
      });
    }, (err: string) => {
    });
  }

}
