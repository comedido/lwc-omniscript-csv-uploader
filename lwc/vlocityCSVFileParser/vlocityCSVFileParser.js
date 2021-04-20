/*
** LWC to upload csv file in order to load Commercial Properties
** Developer: Aaron Dominguez
** Date: 10/09/2020
*/ 

import { LightningElement, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { OmniscriptBaseMixin } from 'vlocity_ins/omniscriptBaseMixin';

const FILE_FORMATS = ['.csv'];
const MAX_FILE_SIZE = 2000000; //Max file size 2.0 MB

export default class VlocityCSVFileParser extends OmniscriptBaseMixin(LightningElement) {
    
    @track columns = [];
    @track data;
    @track showLoadingSpinner = false;
    @track error;    
    
    filesUploaded = [];
    filename;

    // Accepted File Formats - .CSV files
    get acceptedFormats() {
        return FILE_FORMATS;
    }
 
    // Upload Files Button - It loads the file
    importcsv(event){
        if (event.target.files.length > 0) {
            this.filesUploaded = event.target.files;
            this.filename = event.target.files[0].name;
            if (this.filesUploaded.size > MAX_FILE_SIZE) {
                this.filename = 'File size exceeded';
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error!!',
                        message: 'File size is too large',
                        variant: 'error',
                    }),
                ); 
            } 
        }
    }

    // Import Button
    readFiles() {
        [...this.template
            .querySelector('lightning-input')
            .files].forEach(async file => {
                try {
                    // Read the CSV
                    const result = await this.load(file);
                    this.showLoadingSpinner = false;

                    // Process the CSV to return a JSON
                    this.data = JSON.parse(this.csvJSON(result));

                    // Update OmniScript JSON
                    this.omniUpdateDataJson(this.data);

                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Success!!',
                            message: 'CSV file parsed !!!',
                            variant: 'success',
                        }),
                    );

                } catch(e) {
                    // handle file load exception
                    console.log('exception....' +JSON.stringify(e));
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Error!!',
                            message: JSON.stringify(e),
                            variant: 'error',
                        }),
                    ); 
                }
            });
    }

    // Reads file asynchronously
    async load(file) {
        return new Promise((resolve, reject) => {
            this.showLoadingSpinner = true;
            const reader = new FileReader();

            // Read file into memory as UTF-8
            reader.onload = function() {
                resolve(reader.result);
            };
            reader.onerror = function() {
                reject(reader.error);
            };

            reader.readAsText(file);
        });
    }

     
    //process CSV input to JSON
    csvJSON(csv){

        var lines = csv.split(/\r\n|\n/);
        var result = [];
        var headers = lines[0].split(";");

        // Set up DataTable columns
        headers.forEach((header, i) => {
            let col = { label: header, fieldName: header }
            this.columns.push(col);
        });

        // Iterate over all rows
        for(var i=1; i<lines.length-1; i++) {
            var obj = {};
            var currentline = lines[i].split(";");

            for(var j=0; j<headers.length; j++) {
                obj[headers[j]] = currentline[j];
            }

            result.push(obj);
        }

        // Return result as a formatted JSON
        return JSON.stringify(result);
    }

    // Super method to validate step in Omniscript
    @api 
    checkValidity() {
        return this.data && this.data.length > 0;
    }

}